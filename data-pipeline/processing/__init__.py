# Processing module - Data transformation and extraction
"""
Core processing components for the Resource Capital data pipeline.

Key modules:
- db_manager: Database operations (Supabase)
- companies, projects, prices, news: Domain-specific operations
- unified_extractor: PDF extraction orchestrator
- cache: In-memory caching layer
- retry, circuit_breaker: Resilience patterns
- structured_logger: JSON logging
- exceptions: Custom exception classes
- job_tracker: Background job monitoring
"""

from .cache import cache, cached, CacheKeys, CacheTTL
from .exceptions import (DatabaseError, ExtractionError, RateLimitError,
                         ResourceCapitalError, ValidationError)
from .retry import RetryConfig, retry
from .structured_logger import get_logger

__all__ = [
    # Exceptions
    "ResourceCapitalError",
    "DatabaseError",
    "ExtractionError",
    "ValidationError",
    "RateLimitError",
    # Utilities
    "get_logger",
    "cache",
    "cached",
    "CacheKeys",
    "CacheTTL",
    "retry",
    "RetryConfig",
]
