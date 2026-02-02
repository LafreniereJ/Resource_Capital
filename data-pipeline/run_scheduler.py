#!/usr/bin/env python3
"""
Enhanced Scheduler for Mining Intelligence Platform

This script runs continuously and executes tasks at scheduled intervals.
Includes job tracking, circuit breaker protection, and health monitoring.

Usage:
    python run_scheduler.py              # Run all scheduled tasks
    python run_scheduler.py --once       # Run all tasks once immediately
    python run_scheduler.py --market     # Run only market data tasks (metals + stocks)

Tasks:
    - Stock prices: Every 15 minutes
    - Metal prices: Every 15 minutes
    - News fetch: Every 15 minutes
    - Extraction trigger: Every 30 minutes
    - Extraction worker: Every hour

Press Ctrl+C to stop the scheduler.
"""

import os
import sys
import time
import logging
import argparse
import subprocess
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

# Add processing directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'processing'))

# Setup logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(log_dir, 'scheduler.log'))
    ]
)
logger = logging.getLogger(__name__)

# Script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


@dataclass
class TaskResult:
    """Result of a task execution."""
    success: bool
    return_code: int
    duration_seconds: float
    records_processed: int = 0
    error_message: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None


class Task:
    """Represents a scheduled task with enhanced tracking."""

    def __init__(
        self,
        name: str,
        script: str,
        interval_minutes: int,
        enabled: bool = True,
        timeout_seconds: int = 600,
        max_consecutive_failures: int = 5,
    ):
        self.name = name
        self.script = script
        self.interval = timedelta(minutes=interval_minutes)
        self.enabled = enabled
        self.timeout_seconds = timeout_seconds
        self.max_consecutive_failures = max_consecutive_failures

        self.last_run: Optional[datetime] = None
        self.last_success: Optional[datetime] = None
        self.running = False
        self.consecutive_failures = 0
        self._lock = threading.Lock()

    def should_run(self) -> bool:
        """Check if task should run now."""
        with self._lock:
            if not self.enabled or self.running:
                return False

            # Check circuit breaker - pause if too many consecutive failures
            if self.consecutive_failures >= self.max_consecutive_failures:
                # Allow retry after backoff period (failures * 5 minutes)
                backoff = timedelta(minutes=self.consecutive_failures * 5)
                if self.last_run and datetime.now() < self.last_run + backoff:
                    return False
                # Reset circuit breaker for retry
                logger.info(f"Task '{self.name}' circuit breaker reset, attempting retry")
                self.consecutive_failures = 0

            if self.last_run is None:
                return True

            return datetime.now() >= self.last_run + self.interval

    def run(self) -> TaskResult:
        """Execute the task script with tracking."""
        with self._lock:
            if self.running:
                return TaskResult(
                    success=False,
                    return_code=-1,
                    duration_seconds=0,
                    error_message="Task already running"
                )
            self.running = True

        script_path = os.path.join(SCRIPT_DIR, self.script)
        start_time = time.time()

        if not os.path.exists(script_path):
            with self._lock:
                self.running = False
            return TaskResult(
                success=False,
                return_code=-1,
                duration_seconds=0,
                error_message=f"Script not found: {script_path}"
            )

        try:
            # Use job tracker for execution tracking
            try:
                from job_tracker import get_tracker
                tracker = get_tracker()
                with tracker.track(self.name) as job:
                    result = self._execute_script(script_path)
                    job.set_records_processed(result.records_processed)
                    if not result.success:
                        raise Exception(result.error_message or "Task failed")
            except ImportError:
                # Fallback if job_tracker not available
                result = self._execute_script(script_path)

            duration = time.time() - start_time
            result.duration_seconds = duration

            with self._lock:
                self.last_run = datetime.now()
                if result.success:
                    self.last_success = datetime.now()
                    self.consecutive_failures = 0
                    logger.info(f"Task completed: {self.name} ({duration:.1f}s)")
                else:
                    self.consecutive_failures += 1
                    logger.warning(
                        f"Task failed: {self.name} "
                        f"(consecutive failures: {self.consecutive_failures})"
                    )

            return result

        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            with self._lock:
                self.last_run = datetime.now()
                self.consecutive_failures += 1
            return TaskResult(
                success=False,
                return_code=-1,
                duration_seconds=duration,
                error_message=f"Task timed out after {self.timeout_seconds}s"
            )
        except Exception as e:
            duration = time.time() - start_time
            with self._lock:
                self.last_run = datetime.now()
                self.consecutive_failures += 1
            return TaskResult(
                success=False,
                return_code=-1,
                duration_seconds=duration,
                error_message=str(e)
            )
        finally:
            with self._lock:
                self.running = False

    def _execute_script(self, script_path: str) -> TaskResult:
        """Execute the script and capture output."""
        logger.info(f"Starting task: {self.name}")

        result = subprocess.run(
            [sys.executable, script_path],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            timeout=self.timeout_seconds
        )

        # Try to parse records processed from stdout
        records_processed = 0
        if result.stdout:
            # Look for pattern like "Processed 203 companies" or "Updated 7 metals"
            import re
            match = re.search(r'(?:Processed|Updated|Fetched|Inserted)\s+(\d+)', result.stdout)
            if match:
                records_processed = int(match.group(1))

        success = result.returncode == 0
        error_message = None
        if not success:
            error_message = result.stderr[:500] if result.stderr else f"Exit code: {result.returncode}"
            logger.warning(f"Task {self.name} failed: {error_message}")

        return TaskResult(
            success=success,
            return_code=result.returncode,
            duration_seconds=0,  # Will be set by caller
            records_processed=records_processed,
            error_message=error_message,
            stdout=result.stdout,
            stderr=result.stderr
        )

    def get_status(self) -> Dict[str, Any]:
        """Get current task status."""
        with self._lock:
            return {
                "name": self.name,
                "script": self.script,
                "interval_minutes": self.interval.total_seconds() / 60,
                "enabled": self.enabled,
                "running": self.running,
                "last_run": self.last_run.isoformat() if self.last_run else None,
                "last_success": self.last_success.isoformat() if self.last_success else None,
                "consecutive_failures": self.consecutive_failures,
                "circuit_breaker_open": self.consecutive_failures >= self.max_consecutive_failures,
            }


# Define scheduled tasks
TASKS = {
    'stock_prices': Task(
        name='fetch_stock_prices',
        script='fetch_stock_prices.py',
        interval_minutes=15,
        timeout_seconds=600  # 10 min for 200+ stocks
    ),
    'metal_prices': Task(
        name='fetch_metal_prices',
        script='fetch_metal_prices.py',
        interval_minutes=15,
        timeout_seconds=120  # 2 min for metals
    ),
    'news_fetch': Task(
        name='fetch_news',
        script='fetch_news.py',
        interval_minutes=15,
        timeout_seconds=300  # 5 min
    ),
    'extraction_trigger': Task(
        name='extraction_trigger',
        script='extraction_trigger.py',
        interval_minutes=30,
        timeout_seconds=120
    ),
    'extraction_worker': Task(
        name='extraction_worker',
        script='run_extraction.py',
        interval_minutes=60,
        timeout_seconds=1800  # 30 min for extraction
    ),
    'insider_transactions': Task(
        name='fetch_insider_transactions',
        script='fetch_insider_transactions.py',
        interval_minutes=1440  # Daily
    ),
    'ticker_export': Task(
        name='export_ticker_data',
        script='export_ticker_data.py',
        interval_minutes=15
    ),
    'technical_reports': Task(
        name='fetch_technical_reports',
        script='fetch_technical_reports.py',
        interval_minutes=360,  # Every 6 hours
        timeout_seconds=1200  # 20 min for downloads
    ),
}

# Market-only tasks (for --market flag)
MARKET_TASKS = ['stock_prices', 'metal_prices', 'ticker_export']


def run_task_async(task: Task) -> threading.Thread:
    """Run a task in a separate thread."""
    thread = threading.Thread(target=task.run, daemon=True, name=f"task-{task.name}")
    thread.start()
    return thread


def run_once(task_names: List[str] = None):
    """Run specified tasks once immediately."""
    tasks_to_run = task_names or list(TASKS.keys())

    logger.info("Running tasks once...")
    for name in tasks_to_run:
        if name in TASKS:
            task = TASKS[name]
            logger.info(f"Executing: {task.name}")
            result = task.run()
            if result.success:
                logger.info(f"  ✓ {task.name}: {result.records_processed} records ({result.duration_seconds:.1f}s)")
            else:
                logger.error(f"  ✗ {task.name}: {result.error_message}")
        else:
            logger.warning(f"Unknown task: {name}")


def run_scheduler(task_names: List[str] = None, check_interval: int = 30):
    """
    Run the scheduler continuously.

    Args:
        task_names: List of task names to schedule (None = all)
        check_interval: Seconds between schedule checks
    """
    tasks_to_schedule = task_names or list(TASKS.keys())

    # Enable only specified tasks
    for name, task in TASKS.items():
        task.enabled = name in tasks_to_schedule

    logger.info("=" * 60)
    logger.info("Mining Intelligence Platform - Scheduler Started")
    logger.info("=" * 60)
    logger.info("Scheduled tasks:")
    for name in tasks_to_schedule:
        if name in TASKS:
            task = TASKS[name]
            logger.info(f"  - {task.name}: every {task.interval.total_seconds() / 60:.0f} minutes")
    logger.info("")
    logger.info("Press Ctrl+C to stop")
    logger.info("=" * 60)

    try:
        while True:
            for name in tasks_to_schedule:
                if name in TASKS:
                    task = TASKS[name]
                    if task.should_run():
                        run_task_async(task)

            time.sleep(check_interval)

    except KeyboardInterrupt:
        logger.info("\nScheduler stopped by user")
    except Exception as e:
        logger.error(f"Scheduler error: {e}", exc_info=True)


def show_status():
    """Show current status of all tasks."""
    print("\nTask Status:")
    print("-" * 80)
    print(f"{'Task':<25} {'Status':<12} {'Last Run':<12} {'Failures':<10}")
    print("-" * 80)

    for name, task in TASKS.items():
        status = "Enabled" if task.enabled else "Disabled"
        if task.consecutive_failures >= task.max_consecutive_failures:
            status = "CircuitOpen"
        elif task.running:
            status = "Running"

        last_run = task.last_run.strftime("%H:%M:%S") if task.last_run else "Never"
        failures = str(task.consecutive_failures) if task.consecutive_failures > 0 else "-"

        print(f"  {task.name:<23} {status:<12} {last_run:<12} {failures:<10}")

    print("-" * 80)


def get_scheduler_status() -> Dict[str, Any]:
    """Get scheduler status as dict (for API)."""
    return {
        "running": True,
        "tasks": {name: task.get_status() for name, task in TASKS.items()}
    }


def main():
    parser = argparse.ArgumentParser(description='Mining Intelligence Platform Scheduler')
    parser.add_argument('--once', action='store_true',
                       help='Run all tasks once immediately')
    parser.add_argument('--market', action='store_true',
                       help='Run only market data tasks (stocks + metals)')
    parser.add_argument('--stocks', action='store_true',
                       help='Run only stock prices task')
    parser.add_argument('--metals', action='store_true',
                       help='Run only metal prices task')
    parser.add_argument('--news', action='store_true',
                       help='Run only news fetch task')
    parser.add_argument('--reports', action='store_true',
                       help='Run only technical reports fetch task')
    parser.add_argument('--interval', type=int, default=30,
                       help='Check interval in seconds (default: 30)')
    parser.add_argument('--status', action='store_true',
                       help='Show task status and exit')

    args = parser.parse_args()

    if args.status:
        show_status()
        return

    # Determine which tasks to run
    task_names = None

    if args.market:
        task_names = MARKET_TASKS
    elif args.stocks:
        task_names = ['stock_prices']
    elif args.metals:
        task_names = ['metal_prices']
    elif args.news:
        task_names = ['news_fetch']
    elif args.reports:
        task_names = ['technical_reports']

    if args.once:
        run_once(task_names)
    else:
        run_scheduler(task_names, args.interval)


if __name__ == "__main__":
    main()
