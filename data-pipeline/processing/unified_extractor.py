"""
Unified PDF Extractor for Resource Capital Pipeline.
Orchestrates extraction with Groq LLM as primary and regex patterns as fallback.
"""

import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import fitz

# Load .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ.setdefault(key, value)

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

# Handle imports for both direct execution and module import
try:
    from document_classifier import ClassificationResult, DocumentClassifier
except ImportError:
    from processing.document_classifier import (ClassificationResult,
                                                DocumentClassifier)

# Import table extractor
try:
    from table_extractor import TableExtractor
    HAS_TABLE_EXTRACTOR = True
except ImportError:
    try:
        from processing.table_extractor import TableExtractor
        HAS_TABLE_EXTRACTOR = True
    except ImportError:
        HAS_TABLE_EXTRACTOR = False

# Import models for type conversion
try:
    pass
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class ExtractionResult:
    """Result of a single extraction."""
    extraction_type: str  # 'production', 'mineral_resource', 'economics'
    extraction_method: str  # 'groq_llm', 'regex_pattern'
    data: Dict
    confidence: float
    source_page: Optional[int] = None
    source_section: Optional[str] = None
    raw_text_snippet: Optional[str] = None


class UnifiedExtractor:
    """
    Unified extraction orchestrator with LLM primary and regex fallback.

    Extraction flow:
    1. Classify document type
    2. Detect relevant sections via TOC parsing
    3. Extract data using Groq LLM
    4. Fallback to regex patterns if LLM fails
    5. Return structured results
    """

    # LLM Prompts for different extraction types
    PRODUCTION_PROMPT = """Extract production data from this mining report. Return JSON array with these fields for EACH mine/operation:
{
  "mine_name": "string or null",
  "period": "Q3 2024 format or null",
  "gold_oz": number or null,
  "silver_oz": number or null,
  "copper_lbs": number or null,
  "gold_equivalent_oz": number or null,
  "ore_processed_tonnes": number or null,
  "head_grade_gpt": number or null,
  "recovery_rate_pct": number or null,
  "aisc_per_oz": number or null,
  "cash_cost_per_oz": number or null
}

Return ONLY valid JSON array. Use null for missing values.

Text:
"""

    MINERAL_RESOURCE_PROMPT = """Extract mineral resource/reserve estimates from this report. Return JSON array with these fields for EACH estimate:
{
  "project_name": "string or null",
  "zone_name": "string or null",
  "category": "Measured|Indicated|Inferred|Proven|Probable|M+I|P+P or null",
  "commodity": "Gold|Silver|Copper|etc or null",
  "tonnage_mt": number in million tonnes or null,
  "grade": number or null,
  "grade_unit": "g/t|%|oz/t or null",
  "contained_metal": number or null,
  "contained_unit": "Moz|Mlbs|kt or null",
  "cutoff_grade": number or null
}

Return ONLY valid JSON array. Use null for missing values.

Text:
"""

    ECONOMICS_PROMPT = """Extract project economics from this feasibility study. Return JSON object with these fields:
{
  "project_name": "string or null",
  "study_type": "PEA|PFS|FS or null",
  "npv_million": number in millions USD or null,
  "npv_discount_rate": number (e.g., 5 for 5%) or null,
  "irr_percent": number or null,
  "payback_years": number or null,
  "initial_capex_million": number or null,
  "sustaining_capex_million": number or null,
  "aisc_per_oz": number or null,
  "gold_price_assumption": number USD per oz or null,
  "mine_life_years": number or null,
  "annual_production_oz": number or null
}

Return ONLY valid JSON object. Use null for missing values.

Text:
"""

    # Regex patterns for fallback extraction
    RESOURCE_PATTERNS = {
        'tonnes_mt': r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:mt|million\s*t(?:onnes?)?)',
        'grade_gpt': r'(\d+(?:\.\d+)?)\s*(?:g/t|gpt|grams?\s*per\s*tonne)',
        'contained_moz': r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:moz|million\s*(?:oz|ounces))',
    }

    ECONOMICS_PATTERNS = {
        'npv': r'(?:npv|net\s*present\s*value)[^$\d]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:m|million)?',
        'irr': r'(?:irr|internal\s*rate)[^%\d]*(\d+(?:\.\d+)?)\s*%',
        'payback': r'(?:payback)[^\d]*(\d+(?:\.\d+)?)\s*(?:years?)?',
        'capex': r'(?:initial\s*)?(?:capex|capital)[^$\d]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:m|million)?',
        'aisc': r'(?:aisc)[^$\d]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)',
        'gold_price': r'(?:gold\s*price)[^$\d]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)',
    }

    PRODUCTION_PATTERNS = {
        'gold_oz': r'(?:gold\s*(?:produced|production))[^\d]*(\d+(?:,\d{3})*)\s*(?:oz|ounces)',
        'aisc': r'(?:aisc)[^$\d]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)',
    }

    # Section keywords for TOC navigation
    SECTION_KEYWORDS = {
        'production': ['production', 'operating results', 'quarterly results', 'production summary'],
        'mineral_resource': ['mineral resource', 'resource estimate', 'resource statement', 'mineral inventory'],
        'mineral_reserve': ['mineral reserve', 'reserve estimate', 'reserve statement'],
        'economics': ['economic analysis', 'economic summary', 'project economics', 'financial analysis'],
    }

    def __init__(self, groq_api_key: str = None):
        """Initialize extractor with optional Groq API key."""
        self.api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        self.client = None
        if self.api_key and HAS_GROQ:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize Groq client: {e}")

        self.classifier = DocumentClassifier(groq_api_key=self.api_key)

    def extract_text(self, pdf_path: str, max_pages: int = None) -> str:
        """Extract text from PDF."""
        doc = fitz.open(pdf_path)
        text_parts = []
        limit = min(max_pages, len(doc)) if max_pages else len(doc)

        for i in range(limit):
            page = doc.load_page(i)
            text_parts.append(page.get_text())

        doc.close()
        return "\n".join(text_parts)

    def extract_page_range(self, pdf_path: str, start: int, end: int) -> str:
        """Extract text from specific page range."""
        doc = fitz.open(pdf_path)
        text_parts = []

        for i in range(max(0, start), min(end, len(doc))):
            page = doc.load_page(i)
            text_parts.append(page.get_text())

        doc.close()
        return "\n".join(text_parts)

    def find_section_page(self, toc_text: str, keywords: List[str]) -> Optional[int]:
        """Find page number for a section from TOC text using LLM or regex."""
        toc_lower = toc_text.lower()

        # Try regex first (faster)
        for keyword in keywords:
            # Pattern: keyword followed by dots and page number
            pattern = rf'{re.escape(keyword)}[.\s]*(\d+)'
            match = re.search(pattern, toc_lower)
            if match:
                return int(match.group(1))

        # Try LLM if available
        if self.client:
            prompt = f"Find the page number for sections about: {', '.join(keywords)}. Return ONLY the integer page number, or -1 if not found.\n\nTOC:\n{toc_text[:8000]}"
            try:
                response = self.client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.3-70b-versatile",
                    temperature=0.0,
                    max_tokens=20,
                )
                content = response.choices[0].message.content.strip()
                match = re.search(r'\d+', content)
                if match:
                    page = int(match.group(0))
                    return page if page > 0 else None
            except Exception as e:
                logger.warning(f"LLM section search failed: {e}")

        return None

    def _extract_with_llm(self, text: str, prompt: str, expect_array: bool = True) -> Optional[Dict]:
        """Extract data using Groq LLM."""
        if not self.client:
            return None

        full_prompt = prompt + text[:25000]  # Limit text to fit context

        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": full_prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.0,
                max_tokens=4000,
            )
            content = response.choices[0].message.content.strip()

            # Clean up response
            if '```json' in content:
                content = re.search(r'```json\s*([\s\S]*?)\s*```', content).group(1)
            elif '```' in content:
                content = re.search(r'```\s*([\s\S]*?)\s*```', content).group(1)

            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse LLM JSON response: {e}")
            return None
        except Exception as e:
            logger.warning(f"LLM extraction failed: {e}")
            return None

    def _extract_with_regex(self, text: str, patterns: Dict[str, str]) -> Dict:
        """Fallback extraction using regex patterns."""
        result = {}
        text_lower = text.lower()

        for field, pattern in patterns.items():
            match = re.search(pattern, text_lower)
            if match:
                value = match.group(1).replace(',', '')
                try:
                    result[field] = float(value)
                except ValueError:
                    result[field] = value

        return result

    def extract_production(self, pdf_path: str, classification: ClassificationResult = None) -> Optional[ExtractionResult]:
        """Extract production metrics from document."""
        # Read relevant sections
        toc_text = self.extract_text(pdf_path, max_pages=15)
        page = self.find_section_page(toc_text, self.SECTION_KEYWORDS['production'])

        if page:
            text = self.extract_page_range(pdf_path, page - 1, page + 5)
        else:
            text = self.extract_text(pdf_path, max_pages=30)

        # Try LLM extraction
        llm_result = self._extract_with_llm(text, self.PRODUCTION_PROMPT)
        if llm_result:
            return ExtractionResult(
                extraction_type='production',
                extraction_method='groq_llm',
                data={'metrics': llm_result if isinstance(llm_result, list) else [llm_result]},
                confidence=0.85,
                source_page=page,
                source_section='Production',
                raw_text_snippet=text[:500]
            )

        # Fallback to regex
        regex_result = self._extract_with_regex(text, self.PRODUCTION_PATTERNS)
        if regex_result:
            return ExtractionResult(
                extraction_type='production',
                extraction_method='regex_pattern',
                data={'metrics': [regex_result]},
                confidence=0.5,
                source_page=page,
                source_section='Production',
                raw_text_snippet=text[:500]
            )

        return None

    def extract_mineral_resources(self, pdf_path: str, classification: ClassificationResult = None) -> Optional[ExtractionResult]:
        """
        Extract mineral resource estimates from document.

        Extraction priority:
        1. Table extraction (pdfplumber) - most accurate for structured tables
        2. LLM extraction (Groq) - good for unstructured text
        3. Regex patterns - fallback for simple cases
        """
        toc_text = self.extract_text(pdf_path, max_pages=15)
        page = self.find_section_page(toc_text, self.SECTION_KEYWORDS['mineral_resource'])

        # Try table extraction first (most accurate for NI 43-101 tables)
        if HAS_TABLE_EXTRACTOR:
            try:
                table_extractor = TableExtractor()

                # If we found a specific page, focus on that area
                page_range = (page - 1, page + 10) if page else None
                table_results = table_extractor.extract_from_pdf(pdf_path, page_range=page_range)

                if table_results.get('resource_estimates'):
                    estimates = table_results['resource_estimates']
                    logger.info(f"Table extraction found {len(estimates)} resource estimates")

                    # Convert ResourceEstimate objects to dicts
                    estimates_data = [
                        {
                            'category': e.category,
                            'is_reserve': e.is_reserve,
                            'tonnage_mt': e.tonnes_mt,
                            'grade': e.grade,
                            'grade_unit': e.grade_unit,
                            'contained_metal': e.contained_metal,
                            'contained_unit': e.contained_metal_unit,
                            'commodity': e.commodity,
                            'deposit_name': e.deposit_name,
                        }
                        for e in estimates
                    ]

                    return ExtractionResult(
                        extraction_type='mineral_resource',
                        extraction_method='table_extraction',
                        data={'estimates': estimates_data},
                        confidence=0.90,
                        source_page=page,
                        source_section='Mineral Resources',
                        raw_text_snippet=f"Extracted from {table_results.get('tables_found', 0)} tables"
                    )
            except Exception as e:
                logger.warning(f"Table extraction failed, trying LLM: {e}")

        # Fall back to text extraction for LLM/regex
        if page:
            text = self.extract_page_range(pdf_path, page - 1, page + 8)
        else:
            text = self.extract_text(pdf_path, max_pages=100)

        # Try LLM extraction
        llm_result = self._extract_with_llm(text, self.MINERAL_RESOURCE_PROMPT)
        if llm_result:
            return ExtractionResult(
                extraction_type='mineral_resource',
                extraction_method='groq_llm',
                data={'estimates': llm_result if isinstance(llm_result, list) else [llm_result]},
                confidence=0.85,
                source_page=page,
                source_section='Mineral Resources',
                raw_text_snippet=text[:500]
            )

        # Fallback to regex
        regex_result = self._extract_with_regex(text, self.RESOURCE_PATTERNS)
        if regex_result:
            return ExtractionResult(
                extraction_type='mineral_resource',
                extraction_method='regex_pattern',
                data={'estimates': [regex_result]},
                confidence=0.5,
                source_page=page,
                source_section='Mineral Resources',
                raw_text_snippet=text[:500]
            )

        return None

    def extract_economics(self, pdf_path: str, classification: ClassificationResult = None) -> Optional[ExtractionResult]:
        """
        Extract project economics from document.

        Extraction priority:
        1. Table extraction (pdfplumber) - most accurate for structured tables
        2. LLM extraction (Groq) - good for unstructured text
        3. Regex patterns - fallback for simple cases
        """
        toc_text = self.extract_text(pdf_path, max_pages=15)
        page = self.find_section_page(toc_text, self.SECTION_KEYWORDS['economics'])

        # Try table extraction first
        if HAS_TABLE_EXTRACTOR:
            try:
                table_extractor = TableExtractor()

                # If we found a specific page, focus on that area
                page_range = (page - 1, page + 10) if page else None
                table_results = table_extractor.extract_from_pdf(pdf_path, page_range=page_range)

                econ_params = table_results.get('economic_parameters')
                if econ_params and (econ_params.npv or econ_params.irr):
                    logger.info("Table extraction found economic parameters")

                    return ExtractionResult(
                        extraction_type='economics',
                        extraction_method='table_extraction',
                        data={'economics': {
                            'npv_million': econ_params.npv,
                            'npv_discount_rate': econ_params.npv_discount_rate,
                            'irr_percent': econ_params.irr,
                            'payback_years': econ_params.payback_years,
                            'initial_capex_million': econ_params.capex_initial,
                            'sustaining_capex_million': econ_params.capex_sustaining,
                            'aisc_per_oz': econ_params.aisc_per_oz,
                            'gold_price_assumption': econ_params.gold_price_assumption,
                            'mine_life_years': econ_params.mine_life_years,
                        }},
                        confidence=0.90,
                        source_page=page,
                        source_section='Economics',
                        raw_text_snippet=f"Extracted from {table_results.get('tables_found', 0)} tables"
                    )
            except Exception as e:
                logger.warning(f"Table extraction failed for economics, trying LLM: {e}")

        # Fall back to text extraction for LLM/regex
        if page:
            text = self.extract_page_range(pdf_path, page - 1, page + 8)
        else:
            text = self.extract_text(pdf_path, max_pages=100)

        # Try LLM extraction
        llm_result = self._extract_with_llm(text, self.ECONOMICS_PROMPT, expect_array=False)
        if llm_result:
            return ExtractionResult(
                extraction_type='economics',
                extraction_method='groq_llm',
                data={'economics': llm_result},
                confidence=0.85,
                source_page=page,
                source_section='Economics',
                raw_text_snippet=text[:500]
            )

        # Fallback to regex
        regex_result = self._extract_with_regex(text, self.ECONOMICS_PATTERNS)
        if regex_result:
            return ExtractionResult(
                extraction_type='economics',
                extraction_method='regex_pattern',
                data={'economics': regex_result},
                confidence=0.5,
                source_page=page,
                source_section='Economics',
                raw_text_snippet=text[:500]
            )

        return None

    def extract_all(self, pdf_path: str) -> Dict[str, ExtractionResult]:
        """
        Extract all relevant data from a document.

        Returns dict mapping extraction_type -> ExtractionResult
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        # Classify document first
        classification = self.classifier.classify(pdf_path)
        logger.info(f"Document classified as: {classification.document_type} ({classification.confidence:.2f})")

        results = {}

        # Determine what to extract based on document type
        if classification.document_type in ['earnings', 'mda', 'press_release']:
            # Production-focused documents
            prod_result = self.extract_production(pdf_path, classification)
            if prod_result:
                results['production'] = prod_result

        if classification.document_type == 'technical_report':
            # Technical reports - extract resources and economics
            resource_result = self.extract_mineral_resources(pdf_path, classification)
            if resource_result:
                results['mineral_resource'] = resource_result

            # Check for feasibility study economics
            if classification.document_subtype in ['PEA', 'PFS', 'FS']:
                econ_result = self.extract_economics(pdf_path, classification)
                if econ_result:
                    results['economics'] = econ_result

        # For 'other' or mixed documents, try all extraction types
        if classification.document_type == 'other' or not results:
            for extract_func, key in [
                (self.extract_production, 'production'),
                (self.extract_mineral_resources, 'mineral_resource'),
                (self.extract_economics, 'economics'),
            ]:
                if key not in results:
                    try:
                        result = extract_func(pdf_path, classification)
                        if result:
                            results[key] = result
                    except Exception as e:
                        logger.warning(f"Extraction failed for {key}: {e}")

        return results

    def get_classification(self, pdf_path: str) -> ClassificationResult:
        """Get document classification."""
        return self.classifier.classify(pdf_path)


def extract_document(pdf_path: str) -> Dict[str, ExtractionResult]:
    """Convenience function to extract all data from a PDF."""
    extractor = UnifiedExtractor()
    return extractor.extract_all(pdf_path)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        results = extract_document(sys.argv[1])
        for ext_type, result in results.items():
            print(f"\n=== {ext_type.upper()} ===")
            print(f"Method: {result.extraction_method}")
            print(f"Confidence: {result.confidence}")
            print(f"Data: {json.dumps(result.data, indent=2)}")
    else:
        print("Usage: python unified_extractor.py <pdf_path>")
