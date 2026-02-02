"""
Custom Exceptions for Resource Capital Data Pipeline

Domain-specific exceptions for better error handling and debugging.
All exceptions inherit from ResourceCapitalError base class.

Usage:
    from processing.exceptions import (
        DataFetchError,
        DatabaseError,
        ValidationError,
        ExtractionError,
    )

    try:
        price = fetch_stock_price(ticker)
    except DataFetchError as e:
        logger.error(f"Failed to fetch price: {e}", extra={"ticker": ticker})
"""

from typing import Any, Dict, Optional


class ResourceCapitalError(Exception):
    """
    Base exception for all Resource Capital errors.

    Attributes:
        message: Human-readable error message
        code: Machine-readable error code (e.g., "DATA_FETCH_TIMEOUT")
        details: Additional context as a dictionary
    """

    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code or self.__class__.__name__.upper()
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for logging/API responses."""
        return {
            "error": self.code,
            "message": self.message,
            "details": self.details,
        }

    def __str__(self) -> str:
        if self.details:
            detail_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
            return f"{self.message} ({detail_str})"
        return self.message


# =============================================================================
# DATA FETCHING ERRORS
# =============================================================================

class DataFetchError(ResourceCapitalError):
    """Error fetching data from external source."""


class APIError(DataFetchError):
    """Error from external API (yfinance, RSS, etc.)."""

    def __init__(
        self,
        message: str,
        source: str,
        status_code: Optional[int] = None,
        **details
    ):
        super().__init__(
            message=message,
            code="API_ERROR",
            details={"source": source, "status_code": status_code, **details}
        )


class RateLimitError(DataFetchError):
    """Rate limit exceeded for external API."""

    def __init__(self, source: str, retry_after: Optional[int] = None):
        super().__init__(
            message=f"Rate limit exceeded for {source}",
            code="RATE_LIMIT_EXCEEDED",
            details={"source": source, "retry_after": retry_after}
        )


class TimeoutError(DataFetchError):
    """Request timed out."""

    def __init__(self, source: str, timeout_seconds: float):
        super().__init__(
            message=f"Request to {source} timed out after {timeout_seconds}s",
            code="TIMEOUT",
            details={"source": source, "timeout_seconds": timeout_seconds}
        )


class DataNotFoundError(DataFetchError):
    """Requested data not found."""

    def __init__(self, entity_type: str, identifier: str):
        super().__init__(
            message=f"{entity_type} not found: {identifier}",
            code="NOT_FOUND",
            details={"entity_type": entity_type, "identifier": identifier}
        )


# =============================================================================
# DATABASE ERRORS
# =============================================================================

class DatabaseError(ResourceCapitalError):
    """Database operation error."""


class ConnectionError(DatabaseError):
    """Failed to connect to database."""

    def __init__(self, message: str = "Failed to connect to database"):
        super().__init__(message=message, code="DB_CONNECTION_ERROR")


class QueryError(DatabaseError):
    """Query execution error."""

    def __init__(self, message: str, query: Optional[str] = None):
        details = {}
        if query:
            # Truncate query for logging safety
            details["query_preview"] = query[:200] + "..." if len(query) > 200 else query
        super().__init__(message=message, code="QUERY_ERROR", details=details)


class IntegrityError(DatabaseError):
    """Data integrity constraint violation."""

    def __init__(self, message: str, constraint: Optional[str] = None):
        super().__init__(
            message=message,
            code="INTEGRITY_ERROR",
            details={"constraint": constraint} if constraint else {}
        )


# =============================================================================
# VALIDATION ERRORS
# =============================================================================

class ValidationError(ResourceCapitalError):
    """Input validation error."""


class InvalidTickerError(ValidationError):
    """Invalid stock ticker format."""

    def __init__(self, ticker: str, reason: Optional[str] = None):
        message = f"Invalid ticker: {ticker}"
        if reason:
            message += f" - {reason}"
        super().__init__(
            message=message,
            code="INVALID_TICKER",
            details={"ticker": ticker, "reason": reason}
        )


class InvalidDateRangeError(ValidationError):
    """Invalid date range specified."""

    def __init__(self, start_date: str, end_date: str, reason: str):
        super().__init__(
            message=f"Invalid date range: {start_date} to {end_date} - {reason}",
            code="INVALID_DATE_RANGE",
            details={"start_date": start_date, "end_date": end_date, "reason": reason}
        )


class MissingFieldError(ValidationError):
    """Required field is missing."""

    def __init__(self, field_name: str, entity_type: Optional[str] = None):
        message = f"Missing required field: {field_name}"
        if entity_type:
            message = f"Missing required field '{field_name}' for {entity_type}"
        super().__init__(
            message=message,
            code="MISSING_FIELD",
            details={"field": field_name, "entity_type": entity_type}
        )


# =============================================================================
# EXTRACTION ERRORS
# =============================================================================

class ExtractionError(ResourceCapitalError):
    """Error during data extraction (PDF, web scraping, etc.)."""


class PDFExtractionError(ExtractionError):
    """Error extracting data from PDF."""

    def __init__(self, message: str, filename: Optional[str] = None, page: Optional[int] = None):
        details = {}
        if filename:
            details["filename"] = filename
        if page is not None:
            details["page"] = page
        super().__init__(message=message, code="PDF_EXTRACTION_ERROR", details=details)


class ParsingError(ExtractionError):
    """Error parsing extracted text/data."""

    def __init__(self, message: str, content_type: Optional[str] = None):
        super().__init__(
            message=message,
            code="PARSING_ERROR",
            details={"content_type": content_type} if content_type else {}
        )


class ClassificationError(ExtractionError):
    """Error classifying document or content."""

    def __init__(self, message: str, document_id: Optional[int] = None):
        super().__init__(
            message=message,
            code="CLASSIFICATION_ERROR",
            details={"document_id": document_id} if document_id else {}
        )


# =============================================================================
# PIPELINE ERRORS
# =============================================================================

class PipelineError(ResourceCapitalError):
    """Error in data pipeline execution."""


class JobFailedError(PipelineError):
    """Background job failed."""

    def __init__(self, job_name: str, job_id: str, reason: str):
        super().__init__(
            message=f"Job {job_name} ({job_id}) failed: {reason}",
            code="JOB_FAILED",
            details={"job_name": job_name, "job_id": job_id, "reason": reason}
        )


class CircuitBreakerOpenError(PipelineError):
    """Circuit breaker is open, operation not allowed."""

    def __init__(self, service: str, reset_time: Optional[str] = None):
        super().__init__(
            message=f"Circuit breaker open for {service}",
            code="CIRCUIT_BREAKER_OPEN",
            details={"service": service, "reset_time": reset_time}
        )


# =============================================================================
# AUTHENTICATION / AUTHORIZATION ERRORS
# =============================================================================

class AuthError(ResourceCapitalError):
    """Authentication or authorization error."""


class UnauthorizedError(AuthError):
    """User is not authenticated."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(message=message, code="UNAUTHORIZED")


class ForbiddenError(AuthError):
    """User lacks permission for this action."""

    def __init__(self, action: str, resource: Optional[str] = None):
        message = f"Permission denied for action: {action}"
        if resource:
            message += f" on {resource}"
        super().__init__(
            message=message,
            code="FORBIDDEN",
            details={"action": action, "resource": resource}
        )


class SubscriptionRequiredError(AuthError):
    """Premium subscription required for this feature."""

    def __init__(self, feature: str, required_tier: str = "pro"):
        super().__init__(
            message=f"Subscription to {required_tier} tier required for: {feature}",
            code="SUBSCRIPTION_REQUIRED",
            details={"feature": feature, "required_tier": required_tier}
        )
