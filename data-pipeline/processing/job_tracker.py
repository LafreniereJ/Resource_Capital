"""
Job Tracking for Resource Capital Data Pipeline

Tracks job execution history including success/failure status,
duration, records processed, and error details.

Usage:
    from processing.job_tracker import JobTracker, track_job

    # Using decorator
    @track_job("fetch_stock_prices")
    def fetch_stock_prices():
        # ... fetch logic
        return {"records_processed": 203}

    # Using context manager
    tracker = JobTracker()
    with tracker.track("fetch_metal_prices") as job:
        # ... fetch logic
        job.set_records_processed(7)

    # Query job history
    recent = tracker.get_recent_jobs(limit=20)
    stats = tracker.get_job_stats("fetch_stock_prices")
"""

import json
import logging
import os
import threading
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class JobStatus(Enum):
    """Job execution status."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"  # Some records succeeded, some failed


@dataclass
class JobRecord:
    """Record of a single job execution."""
    job_name: str
    job_id: str
    status: JobStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    records_processed: int = 0
    records_failed: int = 0
    error_message: Optional[str] = None
    error_traceback: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "job_name": self.job_name,
            "job_id": self.job_id,
            "status": self.status.value,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_seconds": self.duration_seconds,
            "records_processed": self.records_processed,
            "records_failed": self.records_failed,
            "error_message": self.error_message,
            "metadata": self.metadata,
        }


class JobContext:
    """Context for tracking a single job execution."""

    def __init__(self, tracker: 'JobTracker', job_name: str, job_id: str):
        self.tracker = tracker
        self.job_name = job_name
        self.job_id = job_id
        self.records_processed = 0
        self.records_failed = 0
        self.metadata: Dict[str, Any] = {}
        self._start_time: Optional[float] = None

    def set_records_processed(self, count: int) -> None:
        """Set the number of records successfully processed."""
        self.records_processed = count

    def add_records_processed(self, count: int) -> None:
        """Add to the number of records processed."""
        self.records_processed += count

    def set_records_failed(self, count: int) -> None:
        """Set the number of records that failed."""
        self.records_failed = count

    def add_records_failed(self, count: int) -> None:
        """Add to the number of failed records."""
        self.records_failed += count

    def set_metadata(self, key: str, value: Any) -> None:
        """Set metadata for this job execution."""
        self.metadata[key] = value

    def __enter__(self) -> 'JobContext':
        """Start tracking the job."""
        self._start_time = time.time()
        self.tracker._start_job(self.job_name, self.job_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        """Complete tracking the job."""
        duration = time.time() - self._start_time if self._start_time else 0

        if exc_type is not None:
            # Job failed with exception
            self.tracker._complete_job(
                job_id=self.job_id,
                status=JobStatus.FAILED,
                duration=duration,
                records_processed=self.records_processed,
                records_failed=self.records_failed,
                error_message=str(exc_val),
                error_traceback=traceback.format_exc(),
                metadata=self.metadata,
            )
            return False  # Re-raise the exception

        # Determine status based on results
        if self.records_failed > 0 and self.records_processed > 0:
            status = JobStatus.PARTIAL
        elif self.records_failed > 0 and self.records_processed == 0:
            status = JobStatus.FAILED
        else:
            status = JobStatus.SUCCESS

        self.tracker._complete_job(
            job_id=self.job_id,
            status=status,
            duration=duration,
            records_processed=self.records_processed,
            records_failed=self.records_failed,
            metadata=self.metadata,
        )
        return False


class JobTracker:
    """
    Tracks job execution history.

    Stores job records in memory with optional persistence to file.
    Thread-safe for concurrent job tracking.
    """

    def __init__(
        self,
        max_history: int = 1000,
        persist_path: Optional[str] = None,
    ):
        """
        Initialize job tracker.

        Args:
            max_history: Maximum job records to keep in memory
            persist_path: Optional file path for persistence
        """
        self.max_history = max_history
        self.persist_path = persist_path
        self._jobs: Dict[str, JobRecord] = {}  # job_id -> JobRecord
        self._job_history: List[JobRecord] = []
        self._lock = threading.RLock()
        self._job_counter = 0

        # Load persisted history if available
        if persist_path and os.path.exists(persist_path):
            self._load_history()

    def _generate_job_id(self, job_name: str) -> str:
        """Generate unique job ID."""
        with self._lock:
            self._job_counter += 1
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            return f"{job_name}_{timestamp}_{self._job_counter}"

    def track(self, job_name: str) -> JobContext:
        """
        Create a context manager for tracking a job.

        Args:
            job_name: Name of the job (e.g., "fetch_stock_prices")

        Returns:
            JobContext for use in with statement
        """
        job_id = self._generate_job_id(job_name)
        return JobContext(self, job_name, job_id)

    def _start_job(self, job_name: str, job_id: str) -> None:
        """Record job start."""
        with self._lock:
            record = JobRecord(
                job_name=job_name,
                job_id=job_id,
                status=JobStatus.RUNNING,
                started_at=datetime.now(),
            )
            self._jobs[job_id] = record

            logger.info(
                f"Job started: {job_name}",
                extra={"job_id": job_id, "job_name": job_name}
            )

    def _complete_job(
        self,
        job_id: str,
        status: JobStatus,
        duration: float,
        records_processed: int = 0,
        records_failed: int = 0,
        error_message: Optional[str] = None,
        error_traceback: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Record job completion."""
        with self._lock:
            if job_id not in self._jobs:
                logger.warning(f"Unknown job ID: {job_id}")
                return

            record = self._jobs[job_id]
            record.status = status
            record.ended_at = datetime.now()
            record.duration_seconds = round(duration, 3)
            record.records_processed = records_processed
            record.records_failed = records_failed
            record.error_message = error_message
            record.error_traceback = error_traceback
            record.metadata = metadata or {}

            # Move to history
            self._job_history.append(record)
            del self._jobs[job_id]

            # Trim history if needed
            if len(self._job_history) > self.max_history:
                self._job_history = self._job_history[-self.max_history:]

            # Log completion
            log_extra = {
                "job_id": job_id,
                "job_name": record.job_name,
                "status": status.value,
                "duration_seconds": record.duration_seconds,
                "records_processed": records_processed,
                "records_failed": records_failed,
            }

            if status == JobStatus.SUCCESS:
                logger.info(f"Job completed: {record.job_name}", extra=log_extra)
            elif status == JobStatus.PARTIAL:
                logger.warning(f"Job partially completed: {record.job_name}", extra=log_extra)
            else:
                logger.error(
                    f"Job failed: {record.job_name} - {error_message}",
                    extra=log_extra
                )

            # Persist if configured
            if self.persist_path:
                self._save_history()

    def get_running_jobs(self) -> List[Dict[str, Any]]:
        """Get currently running jobs."""
        with self._lock:
            return [job.to_dict() for job in self._jobs.values()]

    def get_recent_jobs(
        self,
        job_name: Optional[str] = None,
        limit: int = 20,
        status: Optional[JobStatus] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get recent job executions.

        Args:
            job_name: Filter by job name (optional)
            limit: Maximum records to return
            status: Filter by status (optional)

        Returns:
            List of job records as dictionaries
        """
        with self._lock:
            jobs = self._job_history.copy()

        # Apply filters
        if job_name:
            jobs = [j for j in jobs if j.job_name == job_name]
        if status:
            jobs = [j for j in jobs if j.status == status]

        # Return most recent first
        jobs.reverse()
        return [j.to_dict() for j in jobs[:limit]]

    def get_job_stats(
        self,
        job_name: str,
        since: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Get statistics for a specific job.

        Args:
            job_name: Name of the job
            since: Only include jobs after this time (default: last 24h)

        Returns:
            Statistics dictionary
        """
        if since is None:
            since = datetime.now() - timedelta(hours=24)

        with self._lock:
            jobs = [
                j for j in self._job_history
                if j.job_name == job_name and j.started_at >= since
            ]

        if not jobs:
            return {
                "job_name": job_name,
                "total_runs": 0,
                "success_count": 0,
                "failure_count": 0,
                "partial_count": 0,
                "success_rate": 0.0,
                "avg_duration_seconds": 0.0,
                "total_records_processed": 0,
                "total_records_failed": 0,
            }

        success_count = sum(1 for j in jobs if j.status == JobStatus.SUCCESS)
        failure_count = sum(1 for j in jobs if j.status == JobStatus.FAILED)
        partial_count = sum(1 for j in jobs if j.status == JobStatus.PARTIAL)

        durations = [j.duration_seconds for j in jobs if j.duration_seconds]
        avg_duration = sum(durations) / len(durations) if durations else 0

        return {
            "job_name": job_name,
            "total_runs": len(jobs),
            "success_count": success_count,
            "failure_count": failure_count,
            "partial_count": partial_count,
            "success_rate": round(success_count / len(jobs) * 100, 1),
            "avg_duration_seconds": round(avg_duration, 3),
            "total_records_processed": sum(j.records_processed for j in jobs),
            "total_records_failed": sum(j.records_failed for j in jobs),
            "last_run": jobs[-1].to_dict() if jobs else None,
        }

    def get_all_stats(self, since: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Get statistics for all jobs.

        Args:
            since: Only include jobs after this time (default: last 24h)

        Returns:
            Dictionary with overall and per-job stats
        """
        if since is None:
            since = datetime.now() - timedelta(hours=24)

        with self._lock:
            jobs = [j for j in self._job_history if j.started_at >= since]

        job_names = set(j.job_name for j in jobs)

        return {
            "since": since.isoformat(),
            "total_jobs": len(jobs),
            "success_count": sum(1 for j in jobs if j.status == JobStatus.SUCCESS),
            "failure_count": sum(1 for j in jobs if j.status == JobStatus.FAILED),
            "jobs": {name: self.get_job_stats(name, since) for name in job_names},
        }

    def _save_history(self) -> None:
        """Save job history to file."""
        if not self.persist_path:
            return

        try:
            data = [j.to_dict() for j in self._job_history[-self.max_history:]]
            with open(self.persist_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save job history: {e}")

    def _load_history(self) -> None:
        """Load job history from file."""
        if not self.persist_path or not os.path.exists(self.persist_path):
            return

        try:
            with open(self.persist_path, 'r') as f:
                data = json.load(f)

            for item in data:
                record = JobRecord(
                    job_name=item["job_name"],
                    job_id=item["job_id"],
                    status=JobStatus(item["status"]),
                    started_at=datetime.fromisoformat(item["started_at"]),
                    ended_at=datetime.fromisoformat(item["ended_at"]) if item.get("ended_at") else None,
                    duration_seconds=item.get("duration_seconds"),
                    records_processed=item.get("records_processed", 0),
                    records_failed=item.get("records_failed", 0),
                    error_message=item.get("error_message"),
                    metadata=item.get("metadata", {}),
                )
                self._job_history.append(record)

            logger.info(f"Loaded {len(self._job_history)} job records from history")
        except Exception as e:
            logger.warning(f"Failed to load job history: {e}")


# Global tracker instance
_default_tracker: Optional[JobTracker] = None


def get_tracker() -> JobTracker:
    """Get the default job tracker instance."""
    global _default_tracker
    if _default_tracker is None:
        # Default persist path in logs directory
        persist_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "logs",
            "job_history.json"
        )
        _default_tracker = JobTracker(persist_path=persist_path)
    return _default_tracker


def track_job(job_name: str) -> Callable:
    """
    Decorator to track job execution.

    The decorated function can optionally return a dict with:
    - records_processed: int
    - records_failed: int
    - Any other metadata

    Example:
        @track_job("fetch_stock_prices")
        def fetch_stock_prices():
            # ... fetch logic
            return {"records_processed": 203}
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            tracker = get_tracker()
            with tracker.track(job_name) as job:
                result = func(*args, **kwargs)

                # Extract tracking info from result if available
                if isinstance(result, dict):
                    if "records_processed" in result:
                        job.set_records_processed(result["records_processed"])
                    if "records_failed" in result:
                        job.set_records_failed(result["records_failed"])
                    # Store any other keys as metadata
                    for key, value in result.items():
                        if key not in ("records_processed", "records_failed"):
                            job.set_metadata(key, value)

                return result
        return wrapper
    return decorator
