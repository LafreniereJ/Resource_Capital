#!/usr/bin/env python3
"""
Automated Extraction Service for Resource Capital Pipeline

This service monitors for new documents and automatically extracts:
- Production metrics (quarterly)
- Reserves/resources by classification
- Project economics (NPV, IRR, payback)

Usage:
    python extraction_service.py --watch     # Run continuous monitoring
    python extraction_service.py --process   # Process all pending documents
    python extraction_service.py --test      # Test extraction on sample
    python extraction_service.py --file PDF  # Extract from specific file
"""

import os
import sys
import json
import argparse
import sqlite3
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

# Add parent directories to path
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'processing'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ingestion'))

from config import DB_PATH, setup_logging

# Get GROQ API key from environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("Warning: Groq not installed. Run: pip install groq")

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("Warning: PyMuPDF not installed. Run: pip install pymupdf")

from processing.extraction_prompts import (
    PRODUCTION_EXTRACTION_PROMPT,
    RESERVES_EXTRACTION_PROMPT,
    ECONOMICS_EXTRACTION_PROMPT,
    DOCUMENT_CLASSIFICATION_PROMPT,
    format_prompt,
)

# Setup logging
logger = setup_logging(__name__, log_file="extraction_service.log")


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ExtractionResult:
    """Result of an extraction operation."""
    extraction_type: str  # 'production', 'reserves', 'economics'
    source_file: str
    source_type: str  # 'press_release', 'ni_43_101', 'quarterly'
    source_priority: int  # 1=SEDAR, 2=Press Release, 3=Presentation
    data: List[Dict]
    confidence: float
    extracted_at: str
    error: Optional[str] = None


@dataclass
class DocumentInfo:
    """Information about a document to process."""
    id: int
    file_path: str
    filing_type: str
    company_id: int
    company_ticker: str
    filing_date: str


# =============================================================================
# EXTRACTION SERVICE
# =============================================================================

class ExtractionService:
    """
    Automated extraction service for mining documents.
    
    Supports:
    - Production metrics extraction
    - Reserves/resources extraction
    - Project economics extraction
    """
    
    def __init__(self, groq_api_key: str = None):
        """Initialize the extraction service."""
        self.api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        
        if GROQ_AVAILABLE and self.api_key:
            self.client = Groq(api_key=self.api_key)
            self.model = "llama-3.3-70b-versatile"  # Best for structured extraction
        else:
            self.client = None
            logger.warning("Groq client not available - using fallback extraction")
        
        self.db_path = str(DB_PATH)
    
    def get_db_connection(self) -> sqlite3.Connection:
        """Get database connection with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # =========================================================================
    # TEXT EXTRACTION
    # =========================================================================
    
    def extract_text_from_pdf(self, pdf_path: str, max_pages: int = 30) -> str:
        """Extract text content from a PDF file."""
        if not PYMUPDF_AVAILABLE:
            raise RuntimeError("PyMuPDF not installed")
        
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        
        doc = fitz.open(pdf_path)
        text_parts = []
        
        for page_num in range(min(len(doc), max_pages)):
            page = doc[page_num]
            text_parts.append(f"\n--- Page {page_num + 1} ---\n")
            text_parts.append(page.get_text())
        
        doc.close()
        return "".join(text_parts)
    
    def extract_text_from_file(self, file_path: str) -> str:
        """Extract text from any supported file type."""
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == ".pdf":
            return self.extract_text_from_pdf(file_path)
        elif ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    # =========================================================================
    # LLM EXTRACTION
    # =========================================================================
    
    def _call_llm(self, prompt: str) -> str:
        """Call the Groq LLM with a prompt."""
        if not self.client:
            raise RuntimeError("Groq client not initialized")
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a mining industry data extraction expert. Always respond with valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=4000,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise
    
    def _parse_json_response(self, response: str) -> Any:
        """Parse JSON from LLM response, handling markdown code blocks."""
        # Remove markdown code blocks if present
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        
        return json.loads(response.strip())
    
    # =========================================================================
    # EXTRACTION METHODS
    # =========================================================================
    
    def classify_document(self, text: str) -> Dict:
        """Classify a document to determine extraction strategy."""
        prompt = format_prompt(DOCUMENT_CLASSIFICATION_PROMPT, text[:2000])
        response = self._call_llm(prompt)
        return self._parse_json_response(response)
    
    def extract_production(self, text: str, source_info: Dict = None) -> ExtractionResult:
        """Extract production metrics from document text."""
        prompt = format_prompt(PRODUCTION_EXTRACTION_PROMPT, text)
        
        try:
            response = self._call_llm(prompt)
            data = self._parse_json_response(response)
            
            # Ensure data is a list
            if isinstance(data, dict):
                data = [data]
            
            # Calculate average confidence
            confidences = [item.get("confidence", 0.8) for item in data]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            return ExtractionResult(
                extraction_type="production",
                source_file=source_info.get("file_path", "") if source_info else "",
                source_type=source_info.get("source_type", "press_release") if source_info else "press_release",
                source_priority=source_info.get("source_priority", 2) if source_info else 2,
                data=data,
                confidence=avg_confidence,
                extracted_at=datetime.now().isoformat(),
            )
        except Exception as e:
            logger.error(f"Production extraction failed: {e}")
            return ExtractionResult(
                extraction_type="production",
                source_file=source_info.get("file_path", "") if source_info else "",
                source_type="unknown",
                source_priority=3,
                data=[],
                confidence=0.0,
                extracted_at=datetime.now().isoformat(),
                error=str(e),
            )
    
    def extract_reserves(self, text: str, source_info: Dict = None) -> ExtractionResult:
        """Extract reserves and resources from document text."""
        prompt = format_prompt(RESERVES_EXTRACTION_PROMPT, text)
        
        try:
            response = self._call_llm(prompt)
            data = self._parse_json_response(response)
            
            if isinstance(data, dict):
                data = [data]
            
            confidences = [item.get("confidence", 0.8) for item in data]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            return ExtractionResult(
                extraction_type="reserves",
                source_file=source_info.get("file_path", "") if source_info else "",
                source_type=source_info.get("source_type", "ni_43_101") if source_info else "ni_43_101",
                source_priority=source_info.get("source_priority", 1) if source_info else 1,
                data=data,
                confidence=avg_confidence,
                extracted_at=datetime.now().isoformat(),
            )
        except Exception as e:
            logger.error(f"Reserves extraction failed: {e}")
            return ExtractionResult(
                extraction_type="reserves",
                source_file=source_info.get("file_path", "") if source_info else "",
                source_type="unknown",
                source_priority=3,
                data=[],
                confidence=0.0,
                extracted_at=datetime.now().isoformat(),
                error=str(e),
            )
    
    def extract_economics(self, text: str, source_info: Dict = None) -> ExtractionResult:
        """Extract project economics from document text."""
        prompt = format_prompt(ECONOMICS_EXTRACTION_PROMPT, text)
        
        try:
            response = self._call_llm(prompt)
            data = self._parse_json_response(response)
            
            # Economics is typically a single object
            if isinstance(data, list):
                data = data[0] if data else {}
            
            confidence = data.get("confidence", 0.8)
            
            return ExtractionResult(
                extraction_type="economics",
                source_file=source_info.get("file_path", "") if source_info else "",
                source_type=source_info.get("source_type", "ni_43_101") if source_info else "ni_43_101",
                source_priority=source_info.get("source_priority", 1) if source_info else 1,
                data=[data] if data else [],
                confidence=confidence,
                extracted_at=datetime.now().isoformat(),
            )
        except Exception as e:
            logger.error(f"Economics extraction failed: {e}")
            return ExtractionResult(
                extraction_type="economics",
                source_file=source_info.get("file_path", "") if source_info else "",
                source_type="unknown",
                source_priority=3,
                data=[],
                confidence=0.0,
                extracted_at=datetime.now().isoformat(),
                error=str(e),
            )
    
    def extract_all(self, file_path: str) -> Dict[str, ExtractionResult]:
        """Extract all data types from a document."""
        logger.info(f"Extracting from: {file_path}")
        
        # Extract text
        text = self.extract_text_from_file(file_path)
        
        # Classify document
        try:
            classification = self.classify_document(text)
            doc_type = classification.get("document_type", "unknown")
            logger.info(f"Document classified as: {doc_type}")
        except Exception as e:
            logger.warning(f"Classification failed: {e}")
            doc_type = "unknown"
            classification = {}
        
        source_info = {
            "file_path": file_path,
            "source_type": self._map_doc_type_to_source(doc_type),
            "source_priority": self._get_source_priority(doc_type),
        }
        
        results = {}
        
        # Extract based on document type
        if doc_type in ["production_report", "news_release", "earnings_report"]:
            results["production"] = self.extract_production(text, source_info)
        
        if doc_type in ["technical_report"]:
            results["reserves"] = self.extract_reserves(text, source_info)
            results["economics"] = self.extract_economics(text, source_info)
        
        # If unknown, try production extraction as default
        if not results:
            results["production"] = self.extract_production(text, source_info)
        
        return results
    
    def _map_doc_type_to_source(self, doc_type: str) -> str:
        """Map document type to source type."""
        mapping = {
            "production_report": "quarterly",
            "technical_report": "ni_43_101",
            "earnings_report": "quarterly",
            "news_release": "press_release",
            "investor_presentation": "presentation",
        }
        return mapping.get(doc_type, "press_release")
    
    def _get_source_priority(self, doc_type: str) -> int:
        """Get source priority (1=highest, 3=lowest)."""
        priorities = {
            "technical_report": 1,  # SEDAR/official
            "earnings_report": 1,
            "production_report": 2,
            "news_release": 2,
            "investor_presentation": 3,
        }
        return priorities.get(doc_type, 2)
    
    # =========================================================================
    # DATABASE OPERATIONS
    # =========================================================================
    
    def save_production_data(self, project_id: int, data: Dict, source_info: Dict) -> int:
        """Save production data to database."""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Parse period into period_end date
            period = data.get("period", "")
            period_end = self._parse_period_to_date(period)
            
            cursor.execute("""
                INSERT OR REPLACE INTO mine_production (
                    project_id, period_type, period_end,
                    ore_processed_tonnes, throughput_tpd,
                    gold_produced_oz, silver_produced_oz,
                    copper_produced_lbs, nickel_produced_lbs,
                    uranium_produced_lbs, platinum_produced_oz, palladium_produced_oz,
                    gold_equivalent_oz, copper_equivalent_lbs,
                    aisc_per_oz, cash_cost_per_oz, mining_cost_per_tonne,
                    source_url, source_type, source_priority, confidence_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                project_id,
                "quarterly",
                period_end,
                data.get("ore_processed_tonnes"),
                data.get("throughput_tpd"),
                data.get("gold_produced_oz"),
                data.get("silver_produced_oz"),
                data.get("copper_produced_lbs"),
                data.get("nickel_produced_lbs"),
                data.get("uranium_produced_lbs"),
                data.get("platinum_produced_oz"),
                data.get("palladium_produced_oz"),
                data.get("gold_equivalent_oz"),
                data.get("copper_equivalent_lbs"),
                data.get("aisc_per_oz"),
                data.get("cash_cost_per_oz"),
                data.get("mining_cost_per_tonne"),
                source_info.get("file_path"),
                source_info.get("source_type"),
                source_info.get("source_priority"),
                data.get("confidence", 0.8),
            ))
            
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()
    
    def save_reserves_data(self, project_id: int, data: Dict, source_info: Dict) -> int:
        """Save reserves/resources data to database."""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO reserves_resources (
                    project_id, report_date, category, is_reserve,
                    deposit_name, tonnes, grade, grade_unit,
                    contained_metal, contained_metal_unit,
                    filing_id, technical_report_title
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                project_id,
                data.get("report_date", datetime.now().strftime("%Y-%m-%d")),
                data.get("category"),
                data.get("is_reserve", False),
                data.get("deposit_name"),
                data.get("tonnes_mt"),
                data.get("grade"),
                data.get("grade_unit"),
                data.get("contained_oz") or data.get("contained_lbs"),
                "oz" if data.get("contained_oz") else "lbs",
                None,  # filing_id if available
                source_info.get("file_path"),
            ))
            
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()
    
    def save_economics_data(self, project_id: int, data: Dict, source_info: Dict) -> int:
        """Save project economics data to database."""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO project_economics (
                    project_id, study_type, study_date,
                    npv_million, npv_discount_rate, irr_percent, payback_years,
                    initial_capex_million, sustaining_capex_million, opex_per_tonne,
                    mine_life_years, annual_production_target, production_unit,
                    gold_price_assumption, copper_price_assumption, silver_price_assumption,
                    source_url, source_type, source_priority, confidence_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                project_id,
                data.get("study_type"),
                data.get("study_date", datetime.now().strftime("%Y-%m-%d")),
                data.get("npv_million"),
                data.get("npv_discount_rate"),
                data.get("irr_percent"),
                data.get("payback_years"),
                data.get("initial_capex_million"),
                data.get("sustaining_capex_million"),
                data.get("opex_per_tonne"),
                data.get("mine_life_years"),
                data.get("annual_production_oz") or data.get("annual_production_target"),
                "oz",
                data.get("gold_price_assumption"),
                data.get("copper_price_assumption"),
                data.get("silver_price_assumption"),
                source_info.get("file_path"),
                source_info.get("source_type"),
                source_info.get("source_priority"),
                data.get("confidence", 0.8),
            ))
            
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()
    
    def _parse_period_to_date(self, period: str) -> str:
        """Convert period like 'Q3 2025' to date string."""
        import re
        match = re.match(r"Q(\d)\s*(\d{4})", period)
        if match:
            quarter, year = int(match.group(1)), int(match.group(2))
            # End of quarter dates
            month = quarter * 3
            return f"{year}-{month:02d}-30"
        return datetime.now().strftime("%Y-%m-%d")
    
    # =========================================================================
    # BATCH PROCESSING
    # =========================================================================
    
    def get_pending_documents(self) -> List[DocumentInfo]:
        """Get documents pending extraction."""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT f.id, f.local_path, f.filing_type, f.company_id, c.ticker, f.filing_date
            FROM filings f
            JOIN companies c ON f.company_id = c.id
            WHERE f.is_processed = 0 AND f.local_path IS NOT NULL
            ORDER BY f.filing_date DESC
            LIMIT 50
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        return [
            DocumentInfo(
                id=row["id"],
                file_path=row["local_path"],
                filing_type=row["filing_type"],
                company_id=row["company_id"],
                company_ticker=row["ticker"],
                filing_date=row["filing_date"],
            )
            for row in rows
        ]
    
    def process_document(self, doc: DocumentInfo) -> Dict[str, ExtractionResult]:
        """Process a single document and save results."""
        logger.info(f"Processing: {doc.file_path} ({doc.company_ticker})")
        
        try:
            results = self.extract_all(doc.file_path)
            
            # Get project for this company (use first/primary project)
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM projects WHERE company_id = ? LIMIT 1", (doc.company_id,))
            project_row = cursor.fetchone()
            conn.close()
            
            if project_row:
                project_id = project_row["id"]
                source_info = {
                    "file_path": doc.file_path,
                    "source_type": self._map_doc_type_to_source(doc.filing_type),
                    "source_priority": 1 if "SEDAR" in doc.file_path.upper() else 2,
                }
                
                # Save each extraction type
                for ext_type, result in results.items():
                    if result.data and not result.error:
                        for item in result.data:
                            if ext_type == "production":
                                self.save_production_data(project_id, item, source_info)
                            elif ext_type == "reserves":
                                self.save_reserves_data(project_id, item, source_info)
                            elif ext_type == "economics":
                                self.save_economics_data(project_id, item, source_info)
            
            # Mark filing as processed
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE filings SET is_processed = 1 WHERE id = ?", (doc.id,))
            conn.commit()
            conn.close()
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to process {doc.file_path}: {e}")
            return {}
    
    def process_all_pending(self) -> Dict[str, int]:
        """Process all pending documents."""
        docs = self.get_pending_documents()
        logger.info(f"Found {len(docs)} pending documents")
        
        stats = {"processed": 0, "failed": 0}
        
        for doc in docs:
            try:
                results = self.process_document(doc)
                if results:
                    stats["processed"] += 1
                else:
                    stats["failed"] += 1
            except Exception as e:
                logger.error(f"Error processing {doc.file_path}: {e}")
                stats["failed"] += 1
        
        return stats


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Mining Document Extraction Service")
    parser.add_argument("--process", action="store_true", help="Process all pending documents")
    parser.add_argument("--file", type=str, help="Extract from a specific file")
    parser.add_argument("--test", action="store_true", help="Run test extraction")
    parser.add_argument("--watch", action="store_true", help="Watch for new documents (not implemented)")
    
    args = parser.parse_args()
    
    service = ExtractionService()
    
    if args.file:
        print(f"\n{'='*60}")
        print(f"EXTRACTING FROM: {args.file}")
        print(f"{'='*60}")
        
        results = service.extract_all(args.file)
        
        for ext_type, result in results.items():
            print(f"\n--- {ext_type.upper()} ---")
            print(f"Source: {result.source_type} (priority: {result.source_priority})")
            print(f"Confidence: {result.confidence:.2f}")
            if result.error:
                print(f"Error: {result.error}")
            else:
                print(f"Data: {json.dumps(result.data, indent=2)}")
    
    elif args.process:
        print(f"\n{'='*60}")
        print("PROCESSING PENDING DOCUMENTS")
        print(f"{'='*60}")
        
        stats = service.process_all_pending()
        print(f"\nCompleted: {stats['processed']} processed, {stats['failed']} failed")
    
    elif args.test:
        print(f"\n{'='*60}")
        print("TEST MODE")
        print(f"{'='*60}")
        
        # Test with sample text
        sample_text = """
        Barrick Gold Corporation Reports Q3 2025 Production Results
        
        Q3 2025 Highlights:
        - Gold production of 1.05 million ounces
        - AISC of $1,295 per ounce
        - Cash costs of $875 per ounce
        - Copper production of 120 million pounds
        
        Carlin Complex (Nevada):
        - Gold production: 350,000 oz
        - Throughput: 25,000 tonnes per day
        - AISC: $1,150/oz
        
        Pueblo Viejo (Dominican Republic):
        - Gold production: 180,000 oz
        - AISC: $1,050/oz
        """
        
        print("\nExtracting from sample text...")
        result = service.extract_production(sample_text)
        print(f"\nConfidence: {result.confidence:.2f}")
        print(f"Data: {json.dumps(result.data, indent=2)}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
