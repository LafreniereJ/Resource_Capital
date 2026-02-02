"""
Circuit Breaker and Rate Limiting for Resource Capital

Protects external services from being overwhelmed and provides
graceful degradation when services are unavailable.

Circuit Breaker States:
- CLOSED: Normal operation, requests pass through
- OPEN: Service failing, requests fail immediately
- HALF_OPEN: Testing if service recovered

Usage:
    from processing.circuit_breaker import CircuitBreaker, RateLimiter

    # Circuit breaker for API calls
    yfinance_breaker = CircuitBreaker("yfinance", failure_threshold=5)

    @yfinance_breaker
    def fetch_stock_price(ticker):
        return yfinance.get_price(ticker)

    # Rate limiter
    limiter = RateLimiter(calls_per_second=2)

    @limiter
    def call_api():
        pass
"""

import logging
import threading
import time
from dataclasses import dataclass
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, Optional

from .exceptions import CircuitBreakerOpenError, RateLimitError

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5  # Failures before opening
    success_threshold: int = 2  # Successes in half-open before closing
    timeout: float = 60.0  # Seconds to wait before half-open
    half_open_max_calls: int = 3  # Max calls allowed in half-open state


class CircuitBreaker:
    """
    Circuit breaker pattern implementation.

    Prevents cascading failures by failing fast when a service is down.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout: float = 60.0,
    ):
        """
        Initialize circuit breaker.

        Args:
            name: Name for logging/identification
            failure_threshold: Number of failures before opening circuit
            success_threshold: Number of successes in half-open before closing
            timeout: Seconds to wait before attempting recovery
        """
        self.name = name
        self.config = CircuitBreakerConfig(
            failure_threshold=failure_threshold,
            success_threshold=success_threshold,
            timeout=timeout,
        )

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._lock = threading.RLock()

    @property
    def state(self) -> CircuitState:
        """Get current circuit state, checking for timeout transition."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
                    logger.info(
                        f"Circuit breaker '{self.name}' transitioning to HALF_OPEN",
                        extra={"circuit": self.name, "state": "half_open"}
                    )
            return self._state

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if self._last_failure_time is None:
            return True
        return time.time() - self._last_failure_time >= self.config.timeout

    def _on_success(self) -> None:
        """Record a successful call."""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.config.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    logger.info(
                        f"Circuit breaker '{self.name}' CLOSED (service recovered)",
                        extra={"circuit": self.name, "state": "closed"}
                    )
            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success
                self._failure_count = 0

    def _on_failure(self, error: Exception) -> None:
        """Record a failed call."""
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()

            if self._state == CircuitState.HALF_OPEN:
                # Any failure in half-open goes back to open
                self._state = CircuitState.OPEN
                logger.warning(
                    f"Circuit breaker '{self.name}' OPEN (half-open test failed)",
                    extra={"circuit": self.name, "state": "open", "error": str(error)}
                )
            elif self._state == CircuitState.CLOSED:
                if self._failure_count >= self.config.failure_threshold:
                    self._state = CircuitState.OPEN
                    logger.warning(
                        f"Circuit breaker '{self.name}' OPEN (threshold reached: {self._failure_count})",
                        extra={
                            "circuit": self.name,
                            "state": "open",
                            "failures": self._failure_count
                        }
                    )

    def __call__(self, func: Callable) -> Callable:
        """Use as decorator."""
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            return self.call(func, *args, **kwargs)
        return wrapper

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function through circuit breaker.

        Args:
            func: Function to call
            *args, **kwargs: Function arguments

        Returns:
            Function result

        Raises:
            CircuitBreakerOpenError: If circuit is open
        """
        current_state = self.state  # This may transition OPEN -> HALF_OPEN

        if current_state == CircuitState.OPEN:
            raise CircuitBreakerOpenError(
                service=self.name,
                reset_time=self._get_reset_time_str()
            )

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure(e)
            raise

    def _get_reset_time_str(self) -> Optional[str]:
        """Get human-readable reset time."""
        if self._last_failure_time is None:
            return None
        reset_at = self._last_failure_time + self.config.timeout
        remaining = max(0, reset_at - time.time())
        return f"{remaining:.0f}s"

    def reset(self) -> None:
        """Manually reset the circuit breaker."""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._last_failure_time = None
            logger.info(f"Circuit breaker '{self.name}' manually reset")

    def get_status(self) -> Dict[str, Any]:
        """Get current status for monitoring."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self._failure_count,
            "success_count": self._success_count,
            "last_failure": self._last_failure_time,
        }


class RateLimiter:
    """
    Token bucket rate limiter.

    Limits the rate of operations to protect external services.
    """

    def __init__(
        self,
        calls_per_second: float = 1.0,
        burst_size: Optional[int] = None,
    ):
        """
        Initialize rate limiter.

        Args:
            calls_per_second: Allowed calls per second
            burst_size: Max burst size (default: 2x calls_per_second)
        """
        self.rate = calls_per_second
        self.burst_size = burst_size or max(1, int(calls_per_second * 2))

        self._tokens = float(self.burst_size)
        self._last_update = time.time()
        self._lock = threading.RLock()

    def _refill(self) -> None:
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self._last_update
        self._tokens = min(
            self.burst_size,
            self._tokens + elapsed * self.rate
        )
        self._last_update = now

    def acquire(self, block: bool = True, timeout: Optional[float] = None) -> bool:
        """
        Acquire a token (permission to proceed).

        Args:
            block: If True, wait for token; if False, fail immediately
            timeout: Max time to wait (only if block=True)

        Returns:
            True if token acquired

        Raises:
            RateLimitError: If non-blocking and no tokens available
        """
        deadline = None
        if timeout is not None:
            deadline = time.time() + timeout

        while True:
            with self._lock:
                self._refill()

                if self._tokens >= 1:
                    self._tokens -= 1
                    return True

                if not block:
                    raise RateLimitError(
                        source="rate_limiter",
                        retry_after=int(1 / self.rate)
                    )

                # Calculate wait time for next token
                wait_time = (1 - self._tokens) / self.rate

            if deadline is not None:
                remaining = deadline - time.time()
                if remaining <= 0:
                    return False
                wait_time = min(wait_time, remaining)

            time.sleep(min(wait_time, 0.1))  # Check periodically

    def __call__(self, func: Callable) -> Callable:
        """Use as decorator."""
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            self.acquire(block=True)
            return func(*args, **kwargs)
        return wrapper

    def get_status(self) -> Dict[str, Any]:
        """Get current status for monitoring."""
        with self._lock:
            self._refill()
            return {
                "rate": self.rate,
                "burst_size": self.burst_size,
                "available_tokens": self._tokens,
            }


# Pre-configured instances for common services
yfinance_limiter = RateLimiter(calls_per_second=0.5)  # 2 seconds between calls
yfinance_breaker = CircuitBreaker("yfinance", failure_threshold=5, timeout=120)

news_limiter = RateLimiter(calls_per_second=2.0)  # 2 calls per second
news_breaker = CircuitBreaker("news_api", failure_threshold=10, timeout=60)
