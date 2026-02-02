# Processing Module

Core database operations and data processing for Resource Capital.

## Structure

```
processing/
├── db_manager.py         # Connection pool & utilities
├── companies.py          # Company CRUD operations
├── projects.py           # Mining project operations
├── prices.py             # Stock & metal price operations
├── news.py               # News article operations
├── exceptions.py         # Domain-specific exceptions
├── structured_logger.py  # JSON logging with context
├── company_loader.py     # TSX company seed data
├── cache.py              # TTL-based in-memory caching
├── retry.py              # Exponential backoff retry logic
├── circuit_breaker.py    # Circuit breaker & rate limiting
├── job_tracker.py        # Job execution tracking
├── document_classifier.py
├── earnings_extractor.py
├── generic_extractor.py
├── groq_extractor.py
├── pdf_parser.py
└── ...
```

## Domain Modules

### companies.py
Company entity operations.

```python
from processing.companies import (
    get_or_create_company,
    upsert_company,
    update_company_price,
    get_all_companies,
    get_company_by_ticker,
    get_company_by_id,
    search_companies,
    get_companies_by_commodity,
    get_companies_by_exchange,
    get_company_count,
)
```

### projects.py
Mining project operations including reserves and production.

```python
from processing.projects import (
    get_or_create_project,
    get_projects_by_company,
    get_project_by_id,
    get_all_projects,
    get_projects_with_coordinates,
    update_project,
    insert_reserves_resources,
    insert_mine_production,
    get_project_reserves,
    get_project_production,
)
```

### prices.py
Stock price history and metal prices.

```python
from processing.prices import (
    # Metal prices
    update_metal_price,
    get_metal_prices,
    get_metal_price,
    get_metal_price_history,

    # Stock price history
    insert_price_history,
    insert_price_history_batch,
    get_price_history,
    get_price_history_range,
    get_latest_price,
    get_price_statistics,
)
```

### news.py
News article management.

```python
from processing.news import (
    insert_news,
    get_recent_news,
    get_news_by_id,
    get_news_by_ticker,
    get_news_by_company,
    get_press_releases,
    search_news,
    get_news_count,
    get_news_sources,
)
```

## Utilities

### db_manager.py
Low-level database connection management.

```python
from processing.db_manager import (
    get_cursor,        # Context manager for DB cursor
    get_connection,    # Context manager for DB connection
    init_db,           # Verify connection
    execute_raw,       # Run raw SQL
    close_pool,        # Close connection pool
)
```

### structured_logger.py
JSON-formatted logging with request/job context.

```python
from processing.structured_logger import (
    get_logger,        # Get configured logger
    set_context,       # Set thread-local context (job_id, request_id)
    clear_context,     # Clear context
    job_logger,        # Get logger for background jobs
)

# Usage
logger = get_logger(__name__)
set_context(job_id="fetch_prices_123")
logger.info("Starting fetch", extra={"ticker_count": 200})
```

### exceptions.py
Domain-specific exceptions for error handling.

```python
from processing.exceptions import (
    # Data fetching
    DataFetchError, APIError, RateLimitError, TimeoutError, DataNotFoundError,

    # Database
    DatabaseError, ConnectionError, QueryError, IntegrityError,

    # Validation
    ValidationError, InvalidTickerError, InvalidDateRangeError, MissingFieldError,

    # Extraction
    ExtractionError, PDFExtractionError, ParsingError, ClassificationError,

    # Pipeline
    PipelineError, JobFailedError, CircuitBreakerOpenError,

    # Auth
    AuthError, UnauthorizedError, ForbiddenError, SubscriptionRequiredError,
)
```

## Environment Variables

Required in `.env`:
```
SUPABASE_DB_URL=postgresql://...
```

Optional:
```
LOG_LEVEL=INFO
STRUCTURED_LOGGING=true
```

## Reliability & Performance

### cache.py
TTL-based in-memory caching for high-read data.

```python
from processing.cache import TTLCache, cached, get_cache

# Using decorator
@cached(ttl=300)  # 5 minutes
def get_metal_prices():
    return fetch_from_db()

# Using cache directly
cache = get_cache()
cache.set("key", value, ttl=600)
value = cache.get("key")
```

### retry.py
Exponential backoff for transient failures.

```python
from processing.retry import retry, retry_api, retry_database

# Using decorator
@retry(max_attempts=3, base_delay=1.0, exceptions=(TimeoutError,))
def fetch_data():
    return api_call()

# Pre-configured decorators
@retry_api       # For external API calls
@retry_database  # For database operations
def my_function():
    pass
```

### circuit_breaker.py
Circuit breaker pattern for external service protection.

```python
from processing.circuit_breaker import (
    CircuitBreaker,
    RateLimiter,
    yfinance_breaker,
    yfinance_limiter,
)

# Pre-configured for yfinance
@yfinance_limiter
@yfinance_breaker
def fetch_stock_price(ticker):
    return yfinance.get_price(ticker)

# Custom circuit breaker
api_breaker = CircuitBreaker("my_api", failure_threshold=5, timeout=60)

@api_breaker
def call_api():
    pass
```

### job_tracker.py
Track job execution for monitoring and debugging.

```python
from processing.job_tracker import track_job, get_tracker

# Using decorator
@track_job("fetch_stock_prices")
def fetch_prices():
    # ... fetch logic
    return {"records_processed": 203}

# Using context manager
tracker = get_tracker()
with tracker.track("my_job") as job:
    job.set_records_processed(100)

# Query job history
stats = tracker.get_job_stats("fetch_stock_prices")
recent = tracker.get_recent_jobs(limit=20)
```

## Database

Uses PostgreSQL via Supabase with psycopg2 connection pooling.

Connection pool settings (configurable via env vars):
- `DB_POOL_MIN_CONN`: Min connections (default: 1)
- `DB_POOL_MAX_CONN`: Max connections (default: 5)

Query performance settings:
- `SLOW_QUERY_THRESHOLD_MS`: Log queries slower than this (default: 500ms)
- `ENABLE_QUERY_LOGGING`: Log all queries (default: false)
