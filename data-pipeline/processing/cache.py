"""
Simple In-Memory Cache for Resource Capital

TTL-based caching for high-read, low-write data like metal prices and company lists.
Thread-safe using locks.

Usage:
    from processing.cache import cache, cached

    # Manual caching
    cache.set("metal_prices", prices, ttl=300)  # 5 min TTL
    prices = cache.get("metal_prices")

    # Decorator
    @cached(ttl=300)
    def get_metal_prices():
        return fetch_from_db()
"""

import logging
import threading
import time
from functools import wraps
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)


class TTLCache:
    """Thread-safe in-memory cache with TTL expiration."""

    def __init__(self, default_ttl: int = 300):
        """
        Initialize cache.

        Args:
            default_ttl: Default time-to-live in seconds (default: 5 minutes)
        """
        self._cache: Dict[str, tuple] = {}  # key -> (value, expires_at)
        self._lock = threading.RLock()
        self._default_ttl = default_ttl
        self._stats = {"hits": 0, "misses": 0, "sets": 0}

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            if key not in self._cache:
                self._stats["misses"] += 1
                return None

            value, expires_at = self._cache[key]
            if time.time() > expires_at:
                # Expired
                del self._cache[key]
                self._stats["misses"] += 1
                return None

            self._stats["hits"] += 1
            return value

    def set(self, key: str, value: Any, ttl: int = None) -> None:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if not specified)
        """
        ttl = ttl if ttl is not None else self._default_ttl
        expires_at = time.time() + ttl

        with self._lock:
            self._cache[key] = (value, expires_at)
            self._stats["sets"] += 1

    def delete(self, key: str) -> bool:
        """
        Delete key from cache.

        Args:
            key: Cache key

        Returns:
            True if key existed
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> int:
        """
        Clear all cached values.

        Returns:
            Number of items cleared
        """
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            return count

    def cleanup_expired(self) -> int:
        """
        Remove expired entries.

        Returns:
            Number of entries removed
        """
        now = time.time()
        removed = 0

        with self._lock:
            expired_keys = [
                k for k, (_, expires_at) in self._cache.items()
                if now > expires_at
            ]
            for key in expired_keys:
                del self._cache[key]
                removed += 1

        return removed

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with hit/miss rates and size
        """
        with self._lock:
            total = self._stats["hits"] + self._stats["misses"]
            hit_rate = self._stats["hits"] / total if total > 0 else 0

            return {
                "hits": self._stats["hits"],
                "misses": self._stats["misses"],
                "sets": self._stats["sets"],
                "hit_rate": round(hit_rate, 3),
                "size": len(self._cache),
            }

    def __contains__(self, key: str) -> bool:
        """Check if key exists and is not expired."""
        return self.get(key) is not None

    def __len__(self) -> int:
        """Return number of items in cache (including expired)."""
        return len(self._cache)


# Global cache instance
cache = TTLCache(default_ttl=300)  # 5 minute default


def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator for caching function results.

    Args:
        ttl: Time-to-live in seconds
        key_prefix: Optional prefix for cache key

    Example:
        @cached(ttl=60)
        def get_metal_prices():
            return db.fetch_prices()

        @cached(ttl=300, key_prefix="company")
        def get_company(ticker: str):
            return db.fetch_company(ticker)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]
            if args:
                key_parts.extend(str(a) for a in args)
            if kwargs:
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))

            cache_key = ":".join(filter(None, key_parts))

            # Try cache first
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_value

            # Compute and cache
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            logger.debug(f"Cache miss, stored: {cache_key}")

            return result

        # Allow manual cache invalidation
        wrapper.cache_key_prefix = key_prefix or func.__name__
        wrapper.invalidate = lambda *args, **kwargs: cache.delete(
            ":".join([key_prefix, func.__name__] + [str(a) for a in args])
        )

        return wrapper

    return decorator


# Predefined cache keys for common data
class CacheKeys:
    """Standard cache key names."""
    METAL_PRICES = "metal_prices"
    COMPANY_LIST = "company_list"
    COMPANY_COUNT = "company_count"
    NEWS_SOURCES = "news_sources"


# TTL presets (in seconds)
class CacheTTL:
    """Standard TTL values."""
    SHORT = 60          # 1 minute
    MEDIUM = 300        # 5 minutes
    LONG = 900          # 15 minutes
    HOUR = 3600         # 1 hour
    METAL_PRICES = 60   # Metal prices update every minute
    COMPANY_LIST = 900  # Company list rarely changes
    NEWS = 300          # News updates every 15 min, cache 5
