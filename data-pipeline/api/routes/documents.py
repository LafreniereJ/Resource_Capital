"""
Document Upload and Extraction API Routes
Handles PDF upload, processing, and extraction result retrieval.
"""

import hashlib
import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import (APIRouter, BackgroundTasks, File, HTTPException, Query,
                     UploadFile)
from pydantic import BaseModel

# Add parent dirs to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'processing'))

from db_manager import delete_document as db_delete_document
from db_manager import (get_company, get_document, get_document_by_hash,
                        get_document_stats, get_documents,
                        get_extraction_results, increment_document_retry,
                        insert_document, insert_extraction_result,
                        update_document_classification, update_document_status)
from document_classifier import DocumentClassifier
from unified_extractor import UnifiedExtractor

# Import table extractor for NI 43-101 specific extraction
try:
    from table_extractor import TableExtractor
    HAS_TABLE_EXTRACTOR = True
except ImportError:
    HAS_TABLE_EXTRACTOR = False

# =============================================================================
# CONFIGURATION
# =============================================================================

# Document storage paths
BASE_DIR = Path(__file__).parent.parent.parent
INCOMING_DIR = BASE_DIR / "documents" / "incoming"
ARCHIVE_DIR = BASE_DIR / "documents" / "archive"

# Ensure directories exist
INCOMING_DIR.mkdir(parents=True, exist_ok=True)
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

# File constraints
MAX_FILE_SIZE_MB = 100
ALLOWED_EXTENSIONS = {'.pdf'}


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class DocumentUploadResponse(BaseModel):
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


class ExtractionResultItem(BaseModel):
    id: int
    extraction_type: str
    extraction_method: str
    confidence_score: Optional[float] = None
    source_page: Optional[int] = None
    source_section: Optional[str] = None
    extracted_data: dict
    created_at: Optional[str] = None


class ReprocessResponse(BaseModel):
    id: int
    status: str
    message: str


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter(prefix="/api/documents", tags=["documents"])


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def compute_file_hash(file_path: str) -> str:
    """Compute SHA256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def get_archive_path(filename: str) -> Path:
    """Get archive path with year-month subdirectory."""
    now = datetime.now()
    subdir = f"{now.year}-{now.month:02d}"
    archive_subdir = ARCHIVE_DIR / subdir
    archive_subdir.mkdir(parents=True, exist_ok=True)
    return archive_subdir / filename


def process_document_background(doc_id: int, file_path: str):
    """Background task to process a document."""
    try:
        # Update status to processing
        update_document_status(doc_id, 'processing')

        # Initialize extractor
        extractor = UnifiedExtractor()

        # Classify document
        classification = extractor.get_classification(file_path)

        # Get company_id if ticker was detected
        company_id = None
        if classification.detected_ticker:
            company = get_company(classification.detected_ticker)
            if company:
                company_id = company['id']

        # Update classification in database
        update_document_classification(
            doc_id,
            document_type=classification.document_type,
            document_subtype=classification.document_subtype,
            classification_confidence=classification.confidence,
            ticker=classification.detected_ticker,
            company_id=company_id
        )

        # Extract data
        results = extractor.extract_all(file_path)

        # Store extraction results
        for ext_type, result in results.items():
            insert_extraction_result(
                document_id=doc_id,
                extraction_type=result.extraction_type,
                extraction_method=result.extraction_method,
                extracted_data=json.dumps(result.data),
                confidence_score=result.confidence,
                source_page=result.source_page,
                source_section=result.source_section,
                raw_text_snippet=result.raw_text_snippet[:500] if result.raw_text_snippet else None
            )

        # Move file to archive
        archive_path = get_archive_path(os.path.basename(file_path))
        shutil.move(file_path, str(archive_path))

        # Update status
        update_document_status(doc_id, 'completed')

    except Exception as e:
        # Log error and update status
        update_document_status(doc_id, 'failed', str(e))


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    ticker: Optional[str] = Query(None, description="Company ticker if known"),
    process_immediately: bool = Query(True, description="Start processing immediately")
):
    """
    Upload a PDF document for extraction.

    - Validates file type and size
    - Computes hash for deduplication
    - Classifies document type
    - Queues for background extraction
    """
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}")

    # Read file content
    content = await file.read()

    # Validate file size
    file_size = len(content)
    if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max size: {MAX_FILE_SIZE_MB}MB")

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = INCOMING_DIR / safe_filename

    # Save file
    with open(file_path, 'wb') as f:
        f.write(content)

    # Compute hash
    file_hash = compute_file_hash(str(file_path))

    # Check for duplicate
    existing = get_document_by_hash(file_hash)
    if existing:
        # Remove the uploaded file
        os.remove(file_path)
        raise HTTPException(
            409,
            f"Duplicate document. Already exists as ID {existing['id']}: {existing['original_filename']}"
        )

    # Quick classification (before full processing)
    classifier = DocumentClassifier()
    try:
        classification = classifier.classify(str(file_path))
    except Exception:
        classification = None

    # Get company_id if ticker provided
    company_id = None
    detected_ticker = ticker
    if ticker:
        company = get_company(ticker.upper())
        if company:
            company_id = company['id']
    elif classification and classification.detected_ticker:
        detected_ticker = classification.detected_ticker
        company = get_company(classification.detected_ticker)
        if company:
            company_id = company['id']

    # Insert document record
    doc_id = insert_document(
        filename=safe_filename,
        original_filename=file.filename,
        file_hash=file_hash,
        file_size=file_size,
        page_count=classifier.get_page_count(str(file_path)) if classification else None,
        document_type=classification.document_type if classification else None,
        document_subtype=classification.document_subtype if classification else None,
        classification_confidence=classification.confidence if classification else None,
        company_id=company_id,
        ticker=detected_ticker,
        upload_source='api',
        storage_path=str(file_path)
    )

    if not doc_id:
        os.remove(file_path)
        raise HTTPException(500, "Failed to create document record")

    # Queue background processing
    if process_immediately:
        background_tasks.add_task(process_document_background, doc_id, str(file_path))

    return DocumentUploadResponse(
        id=doc_id,
        filename=safe_filename,
        original_filename=file.filename,
        status='pending' if process_immediately else 'uploaded',
        document_type=classification.document_type if classification else None,
        document_subtype=classification.document_subtype if classification else None,
        classification_confidence=classification.confidence if classification else None,
        detected_ticker=detected_ticker,
        message="Document uploaded and queued for processing" if process_immediately else "Document uploaded"
    )


@router.get("", response_model=List[DocumentListItem])
async def list_documents(
    status: Optional[str] = Query(None, enum=["pending", "processing", "completed", "failed"]),
    document_type: Optional[str] = Query(None),
    ticker: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """List uploaded documents with optional filters."""
    docs = get_documents(
        status=status,
        document_type=document_type,
        ticker=ticker.upper() if ticker else None,
        limit=limit,
        offset=offset
    )
    return [DocumentListItem(**doc) for doc in docs]


@router.get("/stats")
async def get_stats():
    """Get document processing statistics."""
    return get_document_stats()


@router.get("/{doc_id}")
async def get_document_detail(doc_id: int):
    """Get detailed information about a document including extractions."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document {doc_id} not found")

    # Get extraction results
    extractions = get_extraction_results(document_id=doc_id)

    # Parse extracted_data JSON
    for ext in extractions:
        if ext.get('extracted_data'):
            try:
                ext['extracted_data'] = json.loads(ext['extracted_data'])
            except json.JSONDecodeError:
                pass

    return {
        "document": doc,
        "extractions": extractions,
        "extraction_count": len(extractions)
    }


@router.get("/{doc_id}/extracted-data")
async def get_document_extractions(
    doc_id: int,
    extraction_type: Optional[str] = Query(None)
):
    """Get extraction results for a document."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document {doc_id} not found")

    extractions = get_extraction_results(document_id=doc_id, extraction_type=extraction_type)

    # Parse extracted_data JSON
    results = []
    for ext in extractions:
        if ext.get('extracted_data'):
            try:
                ext['extracted_data'] = json.loads(ext['extracted_data'])
            except json.JSONDecodeError:
                pass
        results.append(ExtractionResultItem(**ext))

    return results


@router.post("/{doc_id}/reprocess", response_model=ReprocessResponse)
async def reprocess_document(
    doc_id: int,
    background_tasks: BackgroundTasks
):
    """Requeue a document for extraction (useful for failed documents)."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document {doc_id} not found")

    # Check retry count
    if doc.get('retry_count', 0) >= 3:
        raise HTTPException(400, "Maximum retry count (3) exceeded")

    # Find the file
    file_path = doc.get('storage_path')
    if not file_path or not os.path.exists(file_path):
        # Check archive
        archive_path = get_archive_path(doc['filename'])
        if archive_path.exists():
            # Move back to incoming for reprocessing
            file_path = INCOMING_DIR / doc['filename']
            shutil.copy(str(archive_path), str(file_path))
        else:
            raise HTTPException(404, "Document file not found")

    # Increment retry count and reset status
    increment_document_retry(doc_id)

    # Queue for processing
    background_tasks.add_task(process_document_background, doc_id, str(file_path))

    return ReprocessResponse(
        id=doc_id,
        status='pending',
        message='Document requeued for processing'
    )


@router.delete("/{doc_id}")
async def delete_document(doc_id: int):
    """Delete a document and its extraction results."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document {doc_id} not found")

    # Try to delete the file
    file_path = doc.get('storage_path')
    if file_path and os.path.exists(file_path):
        os.remove(file_path)

    # Also check archive
    archive_path = get_archive_path(doc['filename'])
    if archive_path.exists():
        os.remove(str(archive_path))

    # Delete from database
    deleted = db_delete_document(doc_id)
    if not deleted:
        raise HTTPException(500, "Failed to delete document record")

    return {"deleted": True, "id": doc_id}


# =============================================================================
# NI 43-101 SPECIFIC ENDPOINTS
# =============================================================================

class NI43101ExtractionResponse(BaseModel):
    document_id: int
    filename: str
    extraction_method: str
    tables_found: int
    pages_processed: int
    resource_estimates: list
    economic_parameters: Optional[dict] = None
    metadata: Optional[dict] = None


class NI43101TableScanResponse(BaseModel):
    filename: str
    resource_pages: list
    economics_pages: list
    total_pages: int


@router.post("/{doc_id}/extract-ni43101", response_model=NI43101ExtractionResponse)
async def extract_ni43101_data(
    doc_id: int,
    page_start: Optional[int] = Query(None, description="Start page (0-indexed)"),
    page_end: Optional[int] = Query(None, description="End page (0-indexed)")
):
    """
    Extract NI 43-101 resource estimates and economics from a document using table extraction.

    This endpoint uses pdfplumber-based table extraction specifically optimized for
    NI 43-101 technical reports. It extracts:
    - Mineral resource estimates (Measured, Indicated, Inferred)
    - Mineral reserve estimates (Proven, Probable)
    - Project economics (NPV, IRR, payback, CAPEX, AISC)
    """
    if not HAS_TABLE_EXTRACTOR:
        raise HTTPException(500, "Table extractor not available. Install pdfplumber.")

    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document {doc_id} not found")

    # Find the file
    file_path = doc.get('storage_path')
    if not file_path or not os.path.exists(file_path):
        # Check archive
        archive_path = get_archive_path(doc['filename'])
        if archive_path.exists():
            file_path = str(archive_path)
        else:
            raise HTTPException(404, "Document file not found")

    try:
        extractor = TableExtractor()

        # Set page range if specified
        page_range = None
        if page_start is not None or page_end is not None:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                total_pages = len(pdf.pages)
            page_range = (
                page_start if page_start is not None else 0,
                page_end if page_end is not None else total_pages
            )

        # Extract tables
        results = extractor.extract_from_pdf(file_path, page_range=page_range)

        # Convert ResourceEstimate objects to dicts
        resource_data = []
        for est in results.get('resource_estimates', []):
            resource_data.append({
                'category': est.category,
                'is_reserve': est.is_reserve,
                'tonnes_mt': est.tonnes_mt,
                'grade': est.grade,
                'grade_unit': est.grade_unit,
                'contained_metal': est.contained_metal,
                'contained_metal_unit': est.contained_metal_unit,
                'commodity': est.commodity,
                'deposit_name': est.deposit_name,
            })

        # Convert EconomicParameters to dict
        econ_data = None
        if results.get('economic_parameters'):
            params = results['economic_parameters']
            econ_data = {
                'npv_million': params.npv,
                'npv_discount_rate': params.npv_discount_rate,
                'irr_percent': params.irr,
                'payback_years': params.payback_years,
                'capex_initial_million': params.capex_initial,
                'capex_sustaining_million': params.capex_sustaining,
                'aisc_per_oz': params.aisc_per_oz,
                'gold_price_assumption': params.gold_price_assumption,
                'mine_life_years': params.mine_life_years,
            }

        # Store extraction results in database
        if resource_data or econ_data:
            extraction_data = {
                'resource_estimates': resource_data,
                'economic_parameters': econ_data,
                'tables_found': results.get('tables_found', 0),
                'pages_processed': results.get('pages_processed', 0),
            }
            insert_extraction_result(
                document_id=doc_id,
                extraction_type='ni43101_table',
                extraction_method='pdfplumber_table',
                extracted_data=json.dumps(extraction_data),
                confidence_score=0.90 if resource_data else 0.5,
                source_section='NI 43-101 Tables',
            )

        return NI43101ExtractionResponse(
            document_id=doc_id,
            filename=doc['original_filename'],
            extraction_method='pdfplumber_table',
            tables_found=results.get('tables_found', 0),
            pages_processed=results.get('pages_processed', 0),
            resource_estimates=resource_data,
            economic_parameters=econ_data,
        )

    except Exception as e:
        raise HTTPException(500, f"Extraction failed: {str(e)}")


@router.get("/{doc_id}/scan-ni43101", response_model=NI43101TableScanResponse)
async def scan_ni43101_pages(doc_id: int):
    """
    Scan a document to find pages likely containing NI 43-101 data.

    Returns page numbers containing:
    - Resource estimate tables
    - Economics/feasibility data

    Use this to identify relevant pages before running full extraction.
    """
    if not HAS_TABLE_EXTRACTOR:
        raise HTTPException(500, "Table extractor not available. Install pdfplumber.")

    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document {doc_id} not found")

    # Find the file
    file_path = doc.get('storage_path')
    if not file_path or not os.path.exists(file_path):
        archive_path = get_archive_path(doc['filename'])
        if archive_path.exists():
            file_path = str(archive_path)
        else:
            raise HTTPException(404, "Document file not found")

    try:
        extractor = TableExtractor()

        resource_pages = extractor.find_resource_pages(file_path)
        economics_pages = extractor.find_economics_pages(file_path)

        # Get total page count
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)

        return NI43101TableScanResponse(
            filename=doc['original_filename'],
            resource_pages=resource_pages[:20],  # Limit to first 20 matches
            economics_pages=economics_pages[:20],
            total_pages=total_pages
        )

    except Exception as e:
        raise HTTPException(500, f"Scan failed: {str(e)}")
