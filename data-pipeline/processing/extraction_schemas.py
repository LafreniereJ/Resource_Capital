"""
Pydantic schemas for PDF extraction data.
Defines structured output formats for different extraction types.
"""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class ExtractionType(str, Enum):
    """Types of data that can be extracted from documents."""
    PRODUCTION = "production"
    MINERAL_RESOURCE = "mineral_resource"
    MINERAL_RESERVE = "mineral_reserve"
    ECONOMICS = "economics"
    METADATA = "metadata"


class ExtractionMethod(str, Enum):
    """Method used for extraction."""
    GROQ_LLM = "groq_llm"
    REGEX_PATTERN = "regex_pattern"
    TABLE_PARSER = "table_parser"
    HYBRID = "hybrid"


# =============================================================================
# PRODUCTION DATA SCHEMAS
# =============================================================================

class ProductionMetric(BaseModel):
    """Single production metric extracted from document."""
    mine_name: Optional[str] = None
    period: Optional[str] = None  # e.g., "Q3 2024"
    gold_oz: Optional[float] = None
    silver_oz: Optional[float] = None
    copper_lbs: Optional[float] = None
    gold_equivalent_oz: Optional[float] = None
    ore_processed_tonnes: Optional[float] = None
    head_grade_gpt: Optional[float] = None  # grams per tonne
    recovery_rate_pct: Optional[float] = None
    aisc_per_oz: Optional[float] = None
    cash_cost_per_oz: Optional[float] = None


class ProductionExtraction(BaseModel):
    """Production data extraction result."""
    extraction_type: str = ExtractionType.PRODUCTION
    ticker: Optional[str] = None
    company_name: Optional[str] = None
    report_period: Optional[str] = None
    metrics: List[ProductionMetric] = Field(default_factory=list)
    source_page: Optional[int] = None
    raw_text_snippet: Optional[str] = None


# =============================================================================
# MINERAL RESOURCE/RESERVE SCHEMAS
# =============================================================================

class ResourceCategory(str, Enum):
    """Mineral resource classification categories."""
    MEASURED = "Measured"
    INDICATED = "Indicated"
    MEASURED_INDICATED = "Measured + Indicated"
    INFERRED = "Inferred"
    PROVEN = "Proven"
    PROBABLE = "Probable"
    PROVEN_PROBABLE = "Proven + Probable"


class MineralEstimate(BaseModel):
    """Single mineral resource or reserve estimate."""
    project_name: Optional[str] = None
    zone_name: Optional[str] = None
    category: Optional[str] = None  # Measured, Indicated, Inferred, Proven, Probable
    commodity: Optional[str] = None  # Gold, Silver, Copper, etc.
    tonnage_mt: Optional[float] = None  # Million tonnes
    grade: Optional[float] = None
    grade_unit: Optional[str] = None  # g/t, %, oz/t
    contained_metal: Optional[float] = None
    contained_unit: Optional[str] = None  # Moz, Mlbs, kt
    cutoff_grade: Optional[float] = None
    cutoff_unit: Optional[str] = None


class MineralResourceExtraction(BaseModel):
    """Mineral resource extraction result."""
    extraction_type: str = ExtractionType.MINERAL_RESOURCE
    ticker: Optional[str] = None
    company_name: Optional[str] = None
    report_date: Optional[str] = None
    project_name: Optional[str] = None
    estimates: List[MineralEstimate] = Field(default_factory=list)
    source_page: Optional[int] = None
    raw_text_snippet: Optional[str] = None


# =============================================================================
# PROJECT ECONOMICS SCHEMAS
# =============================================================================

class ProjectEconomics(BaseModel):
    """Project economic parameters from feasibility studies."""
    project_name: Optional[str] = None
    study_type: Optional[str] = None  # PEA, PFS, FS
    npv_million: Optional[float] = None
    npv_discount_rate: Optional[float] = None  # e.g., 5%, 8%
    irr_percent: Optional[float] = None
    payback_years: Optional[float] = None
    initial_capex_million: Optional[float] = None
    sustaining_capex_million: Optional[float] = None
    total_capex_million: Optional[float] = None
    aisc_per_oz: Optional[float] = None
    cash_cost_per_oz: Optional[float] = None
    gold_price_assumption: Optional[float] = None
    silver_price_assumption: Optional[float] = None
    copper_price_assumption: Optional[float] = None
    mine_life_years: Optional[float] = None
    annual_production_oz: Optional[float] = None
    strip_ratio: Optional[float] = None
    processing_rate_tpd: Optional[float] = None  # tonnes per day
    recovery_rate_pct: Optional[float] = None


class EconomicsExtraction(BaseModel):
    """Project economics extraction result."""
    extraction_type: str = ExtractionType.ECONOMICS
    ticker: Optional[str] = None
    company_name: Optional[str] = None
    report_date: Optional[str] = None
    economics: ProjectEconomics = Field(default_factory=ProjectEconomics)
    source_page: Optional[int] = None
    raw_text_snippet: Optional[str] = None


# =============================================================================
# DOCUMENT METADATA SCHEMAS
# =============================================================================

class DocumentMetadata(BaseModel):
    """Extracted document metadata."""
    title: Optional[str] = None
    company_name: Optional[str] = None
    ticker: Optional[str] = None
    effective_date: Optional[str] = None
    report_type: Optional[str] = None
    project_name: Optional[str] = None
    authors: List[str] = Field(default_factory=list)
    qualified_persons: List[str] = Field(default_factory=list)


# =============================================================================
# API RESPONSE SCHEMAS
# =============================================================================

class DocumentUploadResponse(BaseModel):
    """Response after uploading a document."""
    id: int
    filename: str
    original_filename: str
    status: str
    document_type: Optional[str] = None
    document_subtype: Optional[str] = None
    classification_confidence: Optional[float] = None
    detected_ticker: Optional[str] = None
    message: str = "Document uploaded successfully"


class DocumentListItem(BaseModel):
    """Document item in list response."""
    id: int
    filename: str
    original_filename: str
    document_type: Optional[str] = None
    document_subtype: Optional[str] = None
    ticker: Optional[str] = None
    company_name: Optional[str] = None
    status: str
    page_count: Optional[int] = None
    uploaded_at: Optional[str] = None
    processed_at: Optional[str] = None


class DocumentDetail(BaseModel):
    """Detailed document information."""
    id: int
    filename: str
    original_filename: str
    file_hash: Optional[str] = None
    file_size: Optional[int] = None
    page_count: Optional[int] = None
    document_type: Optional[str] = None
    document_subtype: Optional[str] = None
    classification_confidence: Optional[float] = None
    ticker: Optional[str] = None
    company_name: Optional[str] = None
    status: str
    upload_source: Optional[str] = None
    storage_path: Optional[str] = None
    uploaded_at: Optional[str] = None
    processed_at: Optional[str] = None
    last_error: Optional[str] = None
    retry_count: int = 0
    extraction_count: int = 0


class ExtractionResultResponse(BaseModel):
    """Single extraction result response."""
    id: int
    document_id: int
    extraction_type: str
    extraction_method: str
    confidence_score: Optional[float] = None
    source_page: Optional[int] = None
    source_section: Optional[str] = None
    extracted_data: dict  # Parsed JSON
    created_at: Optional[str] = None


class DocumentStatsResponse(BaseModel):
    """Document processing statistics."""
    by_status: dict
    by_type: dict
    total_extractions: int


class ReprocessResponse(BaseModel):
    """Response after reprocessing request."""
    id: int
    status: str
    message: str
