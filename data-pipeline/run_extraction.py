#!/usr/bin/env python3
"""
Unified Extraction Orchestrator

Processes jobs from the extraction queue:
- Earnings: Uses Groq LLM to extract production data from URLs/PDFs
- Technical Reports: Downloads PDFs and extracts mineral resource data

Run hourly via cron:
0 * * * * cd /path/to/data-pipeline && ./venv/bin/python run_extraction.py --worker >> logs/extraction.log 2>&1

Manual extraction:
python run_extraction.py --url "https://..." --type earnings --ticker AEM
"""

import os
import sys
import logging
import argparse
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import asdict

# Add directories to path
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'processing'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ingestion'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from db_manager import (
    get_connection,
    get_pending_extraction_jobs,
    update_extraction_job,
    get_extraction_queue_stats,
    insert_earnings,
    insert_technical_report,
    insert_mineral_estimate,
    get_company
)

# Setup logging
LOG_DIR = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, 'extraction.log'))
    ]
)

logger = logging.getLogger(__name__)


# =============================================================================
# EARNINGS EXTRACTION
# =============================================================================

def extract_earnings(job: Dict) -> Dict:
    """
    Extract earnings/production data from URL.

    Args:
        job: Queue job with ticker, url, news_id, etc.

    Returns:
        Result dict with success status and extracted data
    """
    ticker = job.get('ticker')
    url = job.get('url')
    company_id = job.get('company_id')

    if not url:
        return {'success': False, 'error': 'No URL provided'}

    logger.info(f"Extracting earnings for {ticker} from {url}")

    try:
        # Import Groq extractor
        from groq_extractor import GroqExtractor

        extractor = GroqExtractor()
        results = extractor.extract_from_url(url)

        if not results:
            return {'success': False, 'error': 'No data extracted'}

        # Store each extracted record
        stored_count = 0
        for record in results:
            data = asdict(record)

            # Add metadata
            data['ticker'] = ticker
            data['company_id'] = company_id
            data['news_id'] = job.get('news_id')
            data['extraction_method'] = 'groq'
            data['confidence'] = 0.8  # Default confidence

            # Map fields to database schema
            earnings_data = {
                'company_id': company_id,
                'ticker': ticker,
                'period': data.get('period'),
                'mine_name': data.get('mine_name'),
                'gold_oz': data.get('gold_oz'),
                'silver_oz': data.get('silver_oz'),
                'copper_lbs': data.get('copper_lbs'),
                'gold_equivalent_oz': data.get('gold_equivalent_oz'),
                'ore_processed_tonnes': data.get('ore_processed_tonnes'),
                'head_grade': data.get('head_grade'),
                'recovery_rate': data.get('recovery_rate'),
                'aisc_per_oz': data.get('aisc_per_oz'),
                'cash_cost_per_oz': data.get('cash_cost_per_oz'),
                'source_url': url,
                'news_id': job.get('news_id'),
                'extraction_method': 'groq',
                'confidence': 0.8
            }

            # Insert into database
            if insert_earnings(**earnings_data):
                stored_count += 1

        return {
            'success': True,
            'records_extracted': len(results),
            'records_stored': stored_count
        }

    except ImportError as e:
        return {'success': False, 'error': f'Groq not available: {str(e)}'}
    except Exception as e:
        logger.error(f"Earnings extraction failed: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# TECHNICAL REPORT EXTRACTION
# =============================================================================

def extract_technical_report(job: Dict) -> Dict:
    """
    Extract technical report data (NI 43-101, feasibility studies).

    For now, this creates a tracking record. Full PDF extraction
    can be triggered manually or via background worker.

    Args:
        job: Queue job with ticker, url, news_id, etc.

    Returns:
        Result dict with success status
    """
    ticker = job.get('ticker')
    url = job.get('url')
    company_id = job.get('company_id')
    news_id = job.get('news_id')

    logger.info(f"Processing technical report for {ticker}")

    try:
        # Determine report type from URL or title
        report_type = classify_report_type(url or '')

        # Create technical report record (will be fully extracted later)
        report_data = {
            'company_id': company_id,
            'ticker': ticker,
            'report_type': report_type,
            'effective_date': datetime.now().strftime('%Y-%m-%d'),  # Default to today
            'pdf_url': url if url and url.endswith('.pdf') else None,
            'source': 'news_trigger',
            'news_id': news_id
        }

        report_id = insert_technical_report(**report_data)

        if report_id:
            # If we have a PDF URL, try to extract immediately
            if url and url.endswith('.pdf'):
                pdf_result = extract_pdf_content(url, report_id, company_id)
                return {
                    'success': True,
                    'report_id': report_id,
                    'pdf_extracted': pdf_result.get('success', False)
                }

            return {
                'success': True,
                'report_id': report_id,
                'note': 'Report tracked, PDF extraction pending'
            }

        return {'success': False, 'error': 'Failed to create report record'}

    except Exception as e:
        logger.error(f"Technical report extraction failed: {e}")
        return {'success': False, 'error': str(e)}


def classify_report_type(text: str) -> str:
    """Classify technical report type from text."""
    text_lower = text.lower()

    if 'feasibility study' in text_lower or ' fs ' in text_lower:
        if 'pre' in text_lower:
            return 'PFS'
        return 'FS'
    elif 'pea' in text_lower or 'preliminary economic' in text_lower:
        return 'PEA'
    elif 'resource' in text_lower:
        return 'Resource Update'
    elif 'reserve' in text_lower:
        return 'Reserve Update'

    return 'Technical Report'


def extract_pdf_content(pdf_url: str, report_id: int, company_id: int) -> Dict:
    """Download PDF and extract mineral inventory data."""
    import requests
    import tempfile

    logger.info(f"Downloading PDF from {pdf_url}")

    try:
        # Download PDF
        response = requests.get(pdf_url, timeout=60)
        response.raise_for_status()

        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            temp_path = f.name

        # Extract using PDF extractor
        from pdf_extractor import PDFExtractor

        extractor = PDFExtractor()
        text = extractor.extract_text(temp_path, max_pages=50)

        # Find mineral resource section
        section = extractor.find_section(text, 'mineral resource')
        if not section:
            section = extractor.find_section(text, 'resource estimate')

        if section:
            # Extract mineral inventory using LLM
            mineral_data = extractor.extract_mineral_inventory(section)

            for item in mineral_data:
                insert_mineral_estimate(
                    report_id=report_id,
                    company_id=company_id,
                    category=item.get('category'),
                    commodity=item.get('commodity'),
                    tonnage_mt=item.get('tonnage_mt'),
                    grade=item.get('grade'),
                    grade_unit=item.get('grade_unit'),
                    contained_metal=item.get('contained_metal'),
                    contained_unit=item.get('contained_metal_unit')
                )

            # Mark report as extracted
            from db_manager import mark_report_extracted
            mark_report_extracted(report_id)

            # Cleanup
            os.unlink(temp_path)

            return {'success': True, 'estimates_extracted': len(mineral_data)}

        os.unlink(temp_path)
        return {'success': False, 'error': 'No mineral resource section found'}

    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# WORKER
# =============================================================================

def process_job(job: Dict) -> Dict:
    """Route job to appropriate extractor."""
    extraction_type = job.get('extraction_type')

    if extraction_type == 'earnings':
        return extract_earnings(job)
    elif extraction_type == 'technical_report':
        return extract_technical_report(job)
    else:
        return {'success': False, 'error': f'Unknown extraction type: {extraction_type}'}


def run_extraction_worker(max_jobs: int = 10, batch_delay: float = 1.0):
    """
    Main worker loop - processes pending extraction jobs.

    Args:
        max_jobs: Maximum jobs to process in this run
        batch_delay: Seconds to wait between jobs (rate limiting)
    """
    logger.info("=" * 60)
    logger.info(f"Starting extraction worker at {datetime.now().isoformat()}")

    # Get queue stats
    stats = get_extraction_queue_stats()
    logger.info(f"Queue status: {stats.get('pending', 0)} pending jobs")

    if stats.get('pending', 0) == 0:
        logger.info("No pending jobs. Exiting.")
        return

    # Process jobs
    processed = 0
    success_count = 0
    failed_count = 0

    jobs = get_pending_extraction_jobs(limit=max_jobs)
    logger.info(f"Retrieved {len(jobs)} jobs to process")

    for job in jobs:
        job_id = job.get('id')
        ticker = job.get('ticker')
        extraction_type = job.get('extraction_type')

        logger.info(f"Processing job {job_id}: {ticker} ({extraction_type})")

        # Mark as processing
        update_extraction_job(job_id, status='processing')

        # Process
        result = process_job(job)

        # Update status
        if result.get('success'):
            update_extraction_job(job_id, status='completed')
            success_count += 1
            logger.info(f"  Job {job_id} completed: {result}")
        else:
            # Increment attempts and mark failed if too many
            attempts = job.get('attempts', 0) + 1
            if attempts >= 3:
                update_extraction_job(
                    job_id,
                    status='failed',
                    error_message=result.get('error', 'Unknown error')
                )
            else:
                update_extraction_job(
                    job_id,
                    status='pending',  # Retry later
                    error_message=result.get('error', 'Unknown error')
                )
            failed_count += 1
            logger.warning(f"  Job {job_id} failed: {result.get('error')}")

        processed += 1

        # Rate limiting
        if batch_delay > 0:
            time.sleep(batch_delay)

    logger.info(f"Worker finished: {processed} processed, {success_count} success, {failed_count} failed")
    logger.info("=" * 60)

    return {
        'processed': processed,
        'success': success_count,
        'failed': failed_count
    }


def manual_extraction(url: str, extraction_type: str, ticker: str) -> Dict:
    """Run manual extraction without going through queue."""
    logger.info(f"Manual extraction: {ticker} ({extraction_type}) from {url}")

    # Get company info
    company = get_company(ticker)
    if not company:
        return {'success': False, 'error': f'Unknown ticker: {ticker}'}

    job = {
        'ticker': ticker,
        'company_id': company.get('id'),
        'url': url,
        'extraction_type': extraction_type
    }

    return process_job(job)


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unified Extraction Orchestrator")

    parser.add_argument("--worker", action="store_true",
                        help="Run extraction worker to process queue")
    parser.add_argument("--max-jobs", type=int, default=10,
                        help="Maximum jobs to process (default: 10)")

    parser.add_argument("--url", type=str,
                        help="URL to extract from (manual mode)")
    parser.add_argument("--type", type=str, choices=['earnings', 'technical_report'],
                        help="Extraction type (manual mode)")
    parser.add_argument("--ticker", type=str,
                        help="Ticker symbol (manual mode)")

    parser.add_argument("--stats", action="store_true",
                        help="Show extraction queue statistics")

    args = parser.parse_args()

    if args.stats:
        stats = get_extraction_queue_stats()
        print("\n" + "=" * 40)
        print("EXTRACTION QUEUE STATISTICS")
        print("=" * 40)
        print(f"\n  Pending:    {stats.get('pending', 0)}")
        print(f"  Processing: {stats.get('processing', 0)}")
        print(f"  Completed:  {stats.get('completed', 0)}")
        print(f"  Failed:     {stats.get('failed', 0)}")
        if stats.get('by_type'):
            print("\n  By Type:")
            for t in stats['by_type']:
                print(f"    {t['extraction_type']}: {t['count']}")
        print()

    elif args.worker:
        run_extraction_worker(max_jobs=args.max_jobs)

    elif args.url and args.type and args.ticker:
        result = manual_extraction(args.url, args.type, args.ticker.upper())
        print(f"\nExtraction Result:")
        for k, v in result.items():
            print(f"  {k}: {v}")

    else:
        print("Unified Extraction Orchestrator")
        print("=" * 40)
        print("\nUsage:")
        print("  python run_extraction.py --worker              # Process queue")
        print("  python run_extraction.py --stats               # Show statistics")
        print("  python run_extraction.py --url URL --type TYPE --ticker TICKER")
        print("\nExamples:")
        print("  python run_extraction.py --worker --max-jobs 5")
        print("  python run_extraction.py --url 'https://...' --type earnings --ticker AEM")
