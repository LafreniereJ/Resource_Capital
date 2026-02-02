"""
Structured Logging for Resource Capital Data Pipeline

Provides JSON-formatted logging with:
- Consistent structure across all modules
- Request/job ID tracking via context
- Automatic metadata inclusion
- Production-ready log levels

Usage:
    from processing.structured_logger import get_logger, set_context

    logger = get_logger(__name__)

    # In a job/task:
    set_context(job_id="fetch_prices_123")
    logger.info("Starting price fetch", extra={"ticker_count": 200})

    # In an API request:
    set_context(request_id="req_abc123")
    logger.info("Processing request", extra={"endpoint": "/api/stocks"})
"""

import json
import logging
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

# Thread-local storage for context (request_id, job_id, etc.)
_context = threading.local()


def set_context(**kwargs) -> None:
    """
    Set context variables for the current thread.
    These will be included in all subsequent log messages.

    Example:
        set_context(job_id="job_123", ticker="ABX")
    """
    if not hasattr(_context, 'data'):
        _context.data = {}
    _context.data.update(kwargs)


def clear_context() -> None:
    """Clear all context variables for the current thread."""
    _context.data = {}


def get_context() -> Dict[str, Any]:
    """Get current context variables."""
    if not hasattr(_context, 'data'):
        _context.data = {}
    return _context.data.copy()


class JSONFormatter(logging.Formatter):
    """
    JSON log formatter for structured logging.

    Output format:
    {
        "timestamp": "2026-01-20T12:34:56.789Z",
        "level": "INFO",
        "logger": "module.name",
        "message": "Log message",
        "job_id": "optional_context",
        "request_id": "optional_context",
        ...extra_fields
    }
    """

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add context (job_id, request_id, etc.)
        context = get_context()
        if context:
            log_data.update(context)

        # Add extra fields from the log call
        if hasattr(record, '__dict__'):
            extra_keys = set(record.__dict__.keys()) - {
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'pathname', 'process', 'processName', 'relativeCreated',
                'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                'message', 'taskName'
            }
            for key in extra_keys:
                value = getattr(record, key)
                if value is not None:
                    log_data[key] = value

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add source location for errors
        if record.levelno >= logging.ERROR:
            log_data["source"] = {
                "file": record.filename,
                "line": record.lineno,
                "function": record.funcName,
            }

        return json.dumps(log_data, default=str)


class HumanReadableFormatter(logging.Formatter):
    """
    Human-readable formatter for development/console output.
    Includes context in brackets if present.
    """

    def format(self, record: logging.LogRecord) -> str:
        context = get_context()
        context_str = ""
        if context:
            parts = [f"{k}={v}" for k, v in context.items()]
            context_str = f" [{', '.join(parts)}]"

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        base = f"{timestamp} - {record.levelname:<8} - {record.name}{context_str} - {record.getMessage()}"

        # Add extra fields
        extra_parts = []
        if hasattr(record, '__dict__'):
            extra_keys = set(record.__dict__.keys()) - {
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'pathname', 'process', 'processName', 'relativeCreated',
                'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                'message', 'taskName'
            }
            for key in extra_keys:
                value = getattr(record, key)
                if value is not None:
                    extra_parts.append(f"{key}={value}")

        if extra_parts:
            base += f" | {', '.join(extra_parts)}"

        if record.exc_info:
            base += f"\n{self.formatException(record.exc_info)}"

        return base


def get_logger(
    name: str,
    log_file: Optional[str] = None,
    json_format: bool = True,
    level: str = "INFO"
) -> logging.Logger:
    """
    Get a configured logger instance.

    Args:
        name: Logger name (typically __name__)
        log_file: Optional file path for logging (JSON always)
        json_format: Use JSON format for console (True) or human-readable (False)
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if logger.handlers:
        return logger

    logger.setLevel(getattr(logging, level.upper()))
    logger.propagate = False

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper()))

    if json_format:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(HumanReadableFormatter())

    logger.addHandler(console_handler)

    # File handler (always JSON for machine parsing)
    if log_file:
        log_dir = Path(__file__).parent.parent / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_dir / log_file)
        file_handler.setLevel(logging.DEBUG)  # Log everything to file
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)

    return logger


# Convenience function for job logging
def job_logger(job_name: str, job_id: Optional[str] = None) -> logging.Logger:
    """
    Get a logger configured for a background job.

    Args:
        job_name: Name of the job (e.g., "fetch_stock_prices")
        job_id: Optional unique job ID

    Returns:
        Configured logger with job context set
    """
    if job_id is None:
        job_id = f"{job_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    set_context(job_id=job_id, job_name=job_name)

    return get_logger(
        name=f"job.{job_name}",
        log_file=f"{job_name}.log",
        json_format=True
    )


# Default logger for quick imports
default_logger = get_logger("resource_capital", json_format=False)
