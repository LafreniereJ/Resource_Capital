"""
Retry Logic with Exponential Backoff for Resource Capital

Provides decorators and utilities for retrying failed operations
with configurable backoff strategies.

Usage:
    from processing.retry import retry, RetryConfig

    @retry(max_attempts=3, backoff_factor=2.0)
    def fetch_stock_price(ticker: str):
        # Will retry up to 3 times with exponential backoff
        return api.get_price(ticker)

    # Or with custom config
    config = RetryConfig(max_attempts=5, base_delay=0.5)

    @retry(config=config, on_exceptions=(APIError, TimeoutError))
    def fetch_with_custom_config():
        pass
"""

import logging
import random
import time
from dataclasses import dataclass
from functools import wraps
from typing import Any, Callable, Optional, Tuple, Type

logger = logging.getLogger(__name__)


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""

    max_attempts: int = 3
    base_delay: float = 1.0  # seconds
    max_delay: float = 60.0  # seconds
    backoff_factor: float = 2.0  # exponential multiplier
    jitter: bool = True  # add randomness to prevent thundering herd
    jitter_range: Tuple[float, float] = (0.8, 1.2)  # multiply delay by random in range


def calculate_delay(
    attempt: int,
    config: RetryConfig
) -> float:
    """
    Calculate delay for next retry attempt.

    Args:
        attempt: Current attempt number (1-indexed)
        config: Retry configuration

    Returns:
        Delay in seconds
    """
    # Exponential backoff: base_delay * (backoff_factor ^ attempt)
    delay = config.base_delay * (config.backoff_factor ** (attempt - 1))

    # Apply max cap
    delay = min(delay, config.max_delay)

    # Apply jitter
    if config.jitter:
        jitter_multiplier = random.uniform(*config.jitter_range)
        delay *= jitter_multiplier

    return delay


def retry(
    max_attempts: int = 3,
    backoff_factor: float = 2.0,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    on_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    config: Optional[RetryConfig] = None,
    on_retry: Optional[Callable[[Exception, int], None]] = None,
):
    """
    Decorator for retrying functions with exponential backoff.

    Args:
        max_attempts: Maximum number of attempts (default: 3)
        backoff_factor: Multiplier for each retry (default: 2.0)
        base_delay: Initial delay in seconds (default: 1.0)
        max_delay: Maximum delay in seconds (default: 60.0)
        on_exceptions: Tuple of exception types to retry on
        config: Optional RetryConfig to override individual params
        on_retry: Optional callback(exception, attempt) called before each retry

    Example:
        @retry(max_attempts=3, on_exceptions=(TimeoutError, ConnectionError))
        def fetch_data():
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Use config if provided, else build from params
            cfg = config or RetryConfig(
                max_attempts=max_attempts,
                backoff_factor=backoff_factor,
                base_delay=base_delay,
                max_delay=max_delay,
            )

            last_exception = None

            for attempt in range(1, cfg.max_attempts + 1):
                try:
                    return func(*args, **kwargs)

                except on_exceptions as e:
                    last_exception = e

                    if attempt == cfg.max_attempts:
                        logger.error(
                            f"Retry exhausted for {func.__name__} after {attempt} attempts",
                            extra={
                                "function": func.__name__,
                                "attempts": attempt,
                                "error": str(e),
                            }
                        )
                        raise

                    delay = calculate_delay(attempt, cfg)

                    logger.warning(
                        f"Retry {attempt}/{cfg.max_attempts} for {func.__name__}: {e}. "
                        f"Retrying in {delay:.2f}s",
                        extra={
                            "function": func.__name__,
                            "attempt": attempt,
                            "max_attempts": cfg.max_attempts,
                            "delay": delay,
                            "error": str(e),
                        }
                    )

                    if on_retry:
                        on_retry(e, attempt)

                    time.sleep(delay)

            # Should not reach here, but just in case
            if last_exception:
                raise last_exception

        return wrapper

    return decorator


class RetryableOperation:
    """
    Context manager for retryable operations with custom control.

    Example:
        with RetryableOperation(max_attempts=3) as op:
            for attempt in op:
                try:
                    result = risky_operation()
                    break  # Success
                except APIError as e:
                    op.fail(e)  # Will retry or raise
    """

    def __init__(
        self,
        max_attempts: int = 3,
        backoff_factor: float = 2.0,
        base_delay: float = 1.0,
    ):
        self.config = RetryConfig(
            max_attempts=max_attempts,
            backoff_factor=backoff_factor,
            base_delay=base_delay,
        )
        self._attempt = 0
        self._last_error: Optional[Exception] = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def __iter__(self):
        return self

    def __next__(self) -> int:
        self._attempt += 1

        if self._attempt > self.config.max_attempts:
            if self._last_error:
                raise self._last_error
            raise StopIteration

        return self._attempt

    def fail(self, error: Exception) -> None:
        """
        Mark current attempt as failed.

        Args:
            error: The exception that caused the failure
        """
        self._last_error = error

        if self._attempt >= self.config.max_attempts:
            raise error

        delay = calculate_delay(self._attempt, self.config)
        logger.warning(
            f"Attempt {self._attempt}/{self.config.max_attempts} failed: {error}. "
            f"Retrying in {delay:.2f}s"
        )
        time.sleep(delay)

    @property
    def attempt(self) -> int:
        """Current attempt number."""
        return self._attempt


# Pre-configured retry decorators for common use cases
retry_api = retry(
    max_attempts=3,
    backoff_factor=2.0,
    base_delay=1.0,
    max_delay=30.0,
)

retry_database = retry(
    max_attempts=3,
    backoff_factor=1.5,
    base_delay=0.5,
    max_delay=10.0,
)

retry_network = retry(
    max_attempts=5,
    backoff_factor=2.0,
    base_delay=2.0,
    max_delay=60.0,
)
