"""
NI 43-101 Technical Report PDF Parser
Extracts resource/reserve estimates and key economic parameters from technical reports.

Uses PyMuPDF (fitz) for PDF text extraction and regex patterns to identify
common table structures in NI 43-101 compliant reports.

Also integrates pdfplumber-based table extraction for structured tables.
"""

import logging
import os
import re
from typing import Dict, List, Optional, Tuple

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

# Import shared models
try:
    from models import EconomicParameters, ResourceEstimate
except ImportError:
    from processing.models import EconomicParameters, ResourceEstimate

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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


class NI43101Parser:
    """Parser for NI 43-101 Technical Reports."""

    # Patterns for resource/reserve categories
    CATEGORY_PATTERNS = {
        'measured': r'\b(?:measured)\b',
        'indicated': r'\b(?:indicated)\b',
        'inferred': r'\b(?:inferred)\b',
        'proven': r'\b(?:proven|proved)\b',
        'probable': r'\b(?:probable)\b',
        'm&i': r'\b(?:m\s*[+&]\s*i|measured\s*[+&]\s*indicated)\b',
        'p&p': r'\b(?:p\s*[+&]\s*p|proven\s*[+&]\s*probable)\b',
    }

    # Patterns for resource table data
    RESOURCE_PATTERNS = {
        'tonnes': r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:mt|million\s*t(?:onnes?)?|kt|k\s*t)',
        'grade_gold': r'(\d+(?:\.\d+)?)\s*(?:g/t|gpt|grams?\s*per\s*tonne)',
        'grade_copper': r'(\d+(?:\.\d+)?)\s*(?:%\s*cu|percent\s*copper)',
        'contained_oz': r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:moz|million\s*(?:oz|ounces)|koz)',
        'contained_lbs': r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:mlbs?|billion\s*lbs?|blbs?)',
        'cutoff': r'(?:cutoff|cut-off|cog)\s*(?:grade)?\s*(?:of|:)?\s*(\d+(?:\.\d+)?)',
    }

    # Economic parameter patterns
    ECONOMIC_PATTERNS = {
        'npv': r'(?:npv|net\s*present\s*value)[^$]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:m|mm|million|b|billion)?',
        'irr': r'(?:irr|internal\s*rate\s*of\s*return)[:\s]*(\d+(?:\.\d+)?)\s*%',
        'payback': r'(?:payback)[^0-9]*(\d+(?:\.\d+)?)\s*(?:years?)?',
        'capex': r'(?:initial\s*)?(?:capex|capital)[^$]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:m|mm|million|b|billion)?',
        'opex': r'(?:opex|operating\s*cost)[^$]*\$?\s*(\d+(?:\.\d+)?)\s*(?:per\s*t(?:onne)?)?',
        'aisc': r'(?:aisc|all-in\s*sustaining\s*cost)[^$]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)',
        'gold_price': r'(?:gold\s*price|au\s*price)[^$]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:per\s*oz)?',
        'mine_life': r'(?:mine\s*life|lom)[^0-9]*(\d+(?:\.\d+)?)\s*(?:years?)?',
        'production': r'(?:annual|yearly)\s*(?:production|output)[^0-9]*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:koz|oz|moz)?',
    }

    def __init__(self):
        if not HAS_PYMUPDF:
            raise ImportError("PyMuPDF (fitz) is required. Install with: pip install PyMuPDF")

    def extract_text(self, pdf_path: str) -> str:
        """Extract all text from PDF."""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        doc = fitz.open(pdf_path)
        text_parts = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text_parts.append(page.get_text())

        doc.close()
        return "\n".join(text_parts)

    def extract_tables_from_page(self, pdf_path: str, page_num: int) -> List[Dict]:
        """
        Extract tables from a specific page using pdfplumber.

        Args:
            pdf_path: Path to PDF file
            page_num: Page number (0-indexed)

        Returns:
            List of table dictionaries with 'data', 'type', 'estimates', etc.
        """
        if not HAS_TABLE_EXTRACTOR:
            logging.warning("TableExtractor not available, returning empty tables")
            return []

        try:
            extractor = TableExtractor()
            results = extractor.extract_from_pdf(pdf_path, page_range=(page_num, page_num + 1))

            tables = []
            for raw_table in results.get('raw_tables', []):
                table_entry = {
                    'page': page_num,
                    'data': raw_table['data'],
                    'row_count': raw_table['row_count'],
                    'col_count': raw_table['col_count'],
                }
                tables.append(table_entry)

            return tables

        except Exception as e:
            logging.error(f"Error extracting tables from page {page_num}: {e}")
            return []

    def extract_tables_from_pdf(self, pdf_path: str, page_range: Optional[Tuple[int, int]] = None) -> Dict:
        """
        Extract all tables from a PDF using pdfplumber.

        Args:
            pdf_path: Path to PDF file
            page_range: Optional (start, end) page range (0-indexed)

        Returns:
            Dict with 'resource_estimates', 'economic_parameters', 'raw_tables'
        """
        if not HAS_TABLE_EXTRACTOR:
            logging.warning("TableExtractor not available, falling back to regex-only extraction")
            return {
                'resource_estimates': [],
                'economic_parameters': None,
                'raw_tables': [],
            }

        try:
            extractor = TableExtractor()
            return extractor.extract_from_pdf(pdf_path, page_range=page_range)
        except Exception as e:
            logging.error(f"Error in table extraction: {e}")
            return {
                'resource_estimates': [],
                'economic_parameters': None,
                'raw_tables': [],
            }

    def find_resource_section(self, text: str) -> Tuple[int, int]:
        """Find the section containing resource/reserve estimates."""
        patterns = [
            r'mineral\s*resource\s*estimate',
            r'resource\s*statement',
            r'mineral\s*reserves?\s*and\s*resources?',
            r'resource\s*summary',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                # Return a window around the match
                start = max(0, match.start() - 500)
                end = min(len(text), match.end() + 5000)
                return (start, end)

        return (0, len(text))

    def parse_resource_estimates(self, text: str) -> List[ResourceEstimate]:
        """Parse resource/reserve estimates from text."""
        estimates = []

        # Look for resource table sections
        start, end = self.find_resource_section(text)
        section = text[start:end]

        # Pattern to match full resource line: Category: tonnes @ grade = contained
        # Example: "Measured: 12.5 Mt @ 2.35 g/t Au = 0.95 Moz"
        full_line_pattern = re.compile(
            r'(Measured|Indicated|Inferred|Proven|Probable|M\s*[+&]\s*I|P\s*[+&]\s*P|Measured\s*\+\s*Indicated|Proven\s*\+\s*Probable)'
            r'[:\s]*'
            r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:Mt|M\s*t|million\s*t(?:onnes?)?)'
            r'\s*[@at]\s*'
            r'(\d+(?:\.\d+)?)\s*(g/t\s*Au|g/t|gpt|%\s*Cu)'
            r'(?:\s*[=]\s*)?'
            r'(\d+(?:\.\d+)?)\s*(Moz|koz|Mlb)?',
            re.IGNORECASE
        )

        for match in full_line_pattern.finditer(section):
            category_raw = match.group(1).strip()
            tonnes = self._parse_number(match.group(2))
            grade = float(match.group(3))
            grade_unit = match.group(4).strip()
            contained = float(match.group(5)) if match.group(5) else None
            contained_unit = match.group(6) if match.group(6) else 'Moz'

            # Normalize category
            category = category_raw.replace('+', '+')
            if re.match(r'm\s*[+&]\s*i', category, re.IGNORECASE):
                category = 'Measured+Indicated'
            elif re.match(r'p\s*[+&]\s*p', category, re.IGNORECASE):
                category = 'Proven+Probable'
            else:
                category = category.title()

            is_reserve = category.lower() in ['proven', 'probable', 'proven+probable']

            estimate = ResourceEstimate(
                category=category,
                is_reserve=is_reserve,
                tonnes_mt=tonnes,
                grade=grade,
                grade_unit=grade_unit,
                contained_metal=contained,
                contained_metal_unit=contained_unit
            )
            estimates.append(estimate)
            logging.debug(f"Found estimate: {estimate}")

        # If structured pattern didn't work, try line-by-line parsing
        if not estimates:
            estimates = self._parse_resource_lines(section)

        return estimates

    def _parse_resource_lines(self, section: str) -> List[ResourceEstimate]:
        """Fallback line-by-line parsing for resource estimates."""
        estimates = []
        lines = section.split('\n')

        for i, line in enumerate(lines):
            line_lower = line.lower().strip()

            # Check for category at start of line
            category = None
            is_reserve = False

            if line_lower.startswith('measured') and 'indicated' not in line_lower:
                category = 'Measured'
            elif line_lower.startswith('indicated'):
                category = 'Indicated'
            elif line_lower.startswith('inferred'):
                category = 'Inferred'
            elif line_lower.startswith('proven') or line_lower.startswith('proved'):
                category = 'Proven'
                is_reserve = True
            elif line_lower.startswith('probable'):
                category = 'Probable'
                is_reserve = True

            if not category:
                continue

            estimate = ResourceEstimate(
                category=category,
                is_reserve=is_reserve
            )

            # Extract numbers from this line only
            # Look for pattern: number Mt @ number g/t
            line_match = re.search(
                r'(\d+(?:\.\d+)?)\s*(?:Mt|M\s*t).*?(\d+(?:\.\d+)?)\s*(?:g/t)',
                line, re.IGNORECASE
            )
            if line_match:
                estimate.tonnes_mt = float(line_match.group(1))
                estimate.grade = float(line_match.group(2))
                estimate.grade_unit = 'g/t Au'

            # Look for contained ounces: = number Moz
            oz_match = re.search(r'=\s*(\d+(?:\.\d+)?)\s*(?:Moz|koz)', line, re.IGNORECASE)
            if oz_match:
                estimate.contained_metal = float(oz_match.group(1))
                estimate.contained_metal_unit = 'Moz'

            if estimate.tonnes_mt or estimate.contained_metal:
                estimates.append(estimate)

        return estimates

    def parse_economic_parameters(self, text: str) -> EconomicParameters:
        """Parse key economic parameters from text."""
        params = EconomicParameters()
        text_lower = text.lower()

        # NPV
        npv_match = re.search(self.ECONOMIC_PATTERNS['npv'], text_lower)
        if npv_match:
            value = self._parse_number(npv_match.group(1))
            # Check for billion/million multiplier in context
            context = text_lower[max(0, npv_match.start()-20):npv_match.end()+20]
            if 'billion' in context or 'b' in context:
                value *= 1000
            params.npv = value

            # Try to find discount rate near NPV
            rate_match = re.search(r'(\d+(?:\.\d+)?)\s*%', context)
            if rate_match:
                params.npv_discount_rate = float(rate_match.group(1))

        # IRR
        irr_match = re.search(self.ECONOMIC_PATTERNS['irr'], text_lower)
        if irr_match:
            params.irr = float(irr_match.group(1))

        # Payback
        payback_match = re.search(self.ECONOMIC_PATTERNS['payback'], text_lower)
        if payback_match:
            params.payback_years = float(payback_match.group(1))

        # CAPEX
        capex_match = re.search(self.ECONOMIC_PATTERNS['capex'], text_lower)
        if capex_match:
            params.capex_initial = self._parse_number(capex_match.group(1))

        # AISC
        aisc_match = re.search(self.ECONOMIC_PATTERNS['aisc'], text_lower)
        if aisc_match:
            params.aisc_per_oz = self._parse_number(aisc_match.group(1))

        # Gold price assumption
        gold_match = re.search(self.ECONOMIC_PATTERNS['gold_price'], text_lower)
        if gold_match:
            params.gold_price_assumption = self._parse_number(gold_match.group(1))

        # Mine life
        life_match = re.search(self.ECONOMIC_PATTERNS['mine_life'], text_lower)
        if life_match:
            params.mine_life_years = float(life_match.group(1))

        return params

    def _parse_number(self, value: str) -> float:
        """Parse a number string, handling commas."""
        return float(value.replace(',', ''))

    def parse_report(self, pdf_path: str, use_table_extraction: bool = True) -> Dict:
        """
        Parse a complete NI 43-101 report.

        Uses a hybrid approach:
        1. First tries pdfplumber table extraction (if available)
        2. Falls back to regex-based text extraction

        Args:
            pdf_path: Path to PDF file
            use_table_extraction: Whether to try table extraction first (default True)

        Returns:
            Dict with resource_estimates, economic_parameters, metadata
        """
        logging.info(f"Parsing report: {pdf_path}")

        text = self.extract_text(pdf_path)
        logging.info(f"Extracted {len(text)} characters of text")

        results = {
            'file': os.path.basename(pdf_path),
            'text_length': len(text),
            'resource_estimates': [],
            'economic_parameters': None,
            'metadata': {},
            'extraction_method': 'regex',  # Track which method was used
        }

        # Extract report metadata
        results['metadata'] = self._extract_metadata(text)

        # Try table extraction first (if available and enabled)
        table_estimates = []
        table_economics = None

        if use_table_extraction and HAS_TABLE_EXTRACTOR:
            logging.info("Attempting table-based extraction...")
            try:
                table_results = self.extract_tables_from_pdf(pdf_path)
                table_estimates = table_results.get('resource_estimates', [])
                table_economics = table_results.get('economic_parameters')

                if table_estimates:
                    logging.info(f"Table extraction found {len(table_estimates)} resource estimates")
                    results['extraction_method'] = 'table'
                if table_economics and (table_economics.npv or table_economics.irr):
                    logging.info("Table extraction found economic parameters")
                    results['extraction_method'] = 'table'
            except Exception as e:
                logging.warning(f"Table extraction failed, falling back to regex: {e}")

        # Use table results if available, otherwise fall back to regex
        if table_estimates:
            results['resource_estimates'] = [
                {
                    'category': e.category,
                    'is_reserve': e.is_reserve,
                    'tonnes_mt': e.tonnes_mt,
                    'grade': e.grade,
                    'grade_unit': e.grade_unit,
                    'contained_metal': e.contained_metal,
                    'contained_metal_unit': e.contained_metal_unit,
                    'cutoff_grade': e.cutoff_grade,
                }
                for e in table_estimates
            ]
        else:
            # Fall back to regex-based extraction
            logging.info("Using regex-based extraction for resource estimates")
            estimates = self.parse_resource_estimates(text)
            results['resource_estimates'] = [
                {
                    'category': e.category,
                    'is_reserve': e.is_reserve,
                    'tonnes_mt': e.tonnes_mt,
                    'grade': e.grade,
                    'grade_unit': e.grade_unit,
                    'contained_metal': e.contained_metal,
                    'contained_metal_unit': e.contained_metal_unit,
                    'cutoff_grade': e.cutoff_grade,
                }
                for e in estimates
            ]

        # Use table economics if available, otherwise fall back to regex
        if table_economics and (table_economics.npv or table_economics.irr):
            results['economic_parameters'] = {
                'npv_million': table_economics.npv,
                'npv_discount_rate': table_economics.npv_discount_rate,
                'irr_percent': table_economics.irr,
                'payback_years': table_economics.payback_years,
                'capex_initial_million': table_economics.capex_initial,
                'aisc_per_oz': table_economics.aisc_per_oz,
                'gold_price_assumption': table_economics.gold_price_assumption,
                'mine_life_years': table_economics.mine_life_years,
            }
        else:
            # Fall back to regex-based extraction
            logging.info("Using regex-based extraction for economic parameters")
            params = self.parse_economic_parameters(text)
            results['economic_parameters'] = {
                'npv_million': params.npv,
                'npv_discount_rate': params.npv_discount_rate,
                'irr_percent': params.irr,
                'payback_years': params.payback_years,
                'capex_initial_million': params.capex_initial,
                'aisc_per_oz': params.aisc_per_oz,
                'gold_price_assumption': params.gold_price_assumption,
                'mine_life_years': params.mine_life_years,
            }

        return results

    def _extract_metadata(self, text: str) -> Dict:
        """Extract report metadata like title, date, QP."""
        metadata = {}

        # Try to find report title (usually in first 2000 chars)
        header = text[:2000]

        # Look for NI 43-101 reference
        if 'ni 43-101' in header.lower() or '43-101' in header.lower():
            metadata['is_ni43101'] = True

        # Try to find report type
        report_types = ['feasibility study', 'pre-feasibility', 'pea', 'preliminary economic assessment',
                        'technical report', 'resource estimate']
        for rt in report_types:
            if rt in header.lower():
                metadata['report_type'] = rt.title()
                break

        # Try to find effective date
        date_match = re.search(r'(?:effective\s*date|dated?)[:\s]*(\w+\s+\d{1,2},?\s+\d{4})', header, re.IGNORECASE)
        if date_match:
            metadata['effective_date'] = date_match.group(1)

        # Try to find qualified person
        qp_match = re.search(r'(?:qualified\s*person|qp)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text[:5000])
        if qp_match:
            metadata['qualified_person'] = qp_match.group(1)

        return metadata


def parse_report_cli(pdf_path: str, output_json: bool = False) -> Dict:
    """CLI function to parse a report and display results."""
    parser = NI43101Parser()
    results = parser.parse_report(pdf_path)

    if output_json:
        import json
        print(json.dumps(results, indent=2))
    else:
        print(f"\nReport: {results['file']}")
        print("=" * 60)

        if results['metadata']:
            print("\nMetadata:")
            for key, value in results['metadata'].items():
                print(f"  {key}: {value}")

        if results['resource_estimates']:
            print("\nResource/Reserve Estimates:")
            for est in results['resource_estimates']:
                cat = est['category']
                tonnes = f"{est['tonnes_mt']:.1f} Mt" if est['tonnes_mt'] else "N/A"
                grade = f"{est['grade']:.2f} {est['grade_unit']}" if est['grade'] else "N/A"
                contained = f"{est['contained_metal']:.2f} {est['contained_metal_unit']}" if est['contained_metal'] else "N/A"
                reserve_tag = " [RESERVE]" if est['is_reserve'] else ""
                print(f"  {cat}{reserve_tag}: {tonnes} @ {grade} = {contained}")

        if results['economic_parameters']:
            print("\nEconomic Parameters:")
            params = results['economic_parameters']
            if params.get('npv_million'):
                rate = f" @ {params['npv_discount_rate']}%" if params.get('npv_discount_rate') else ""
                print(f"  NPV{rate}: ${params['npv_million']:.0f}M")
            if params.get('irr_percent'):
                print(f"  IRR: {params['irr_percent']:.1f}%")
            if params.get('payback_years'):
                print(f"  Payback: {params['payback_years']:.1f} years")
            if params.get('capex_initial_million'):
                print(f"  Initial CAPEX: ${params['capex_initial_million']:.0f}M")
            if params.get('aisc_per_oz'):
                print(f"  AISC: ${params['aisc_per_oz']:.0f}/oz")
            if params.get('mine_life_years'):
                print(f"  Mine Life: {params['mine_life_years']:.0f} years")
            if params.get('gold_price_assumption'):
                print(f"  Gold Price: ${params['gold_price_assumption']:.0f}/oz")

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="NI 43-101 Technical Report Parser")
    parser.add_argument("pdf", type=str, nargs="?", help="Path to PDF file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--test", action="store_true", help="Run test with sample text")

    args = parser.parse_args()

    if args.test:
        # Test with sample text
        sample = """
        NI 43-101 Technical Report
        Feasibility Study

        Mineral Resource Estimate (0.5 g/t Au cutoff):
        Measured: 12.5 Mt @ 2.35 g/t Au = 0.95 Moz
        Indicated: 28.3 Mt @ 1.85 g/t Au = 1.68 Moz
        Measured + Indicated: 40.8 Mt @ 2.01 g/t Au = 2.63 Moz
        Inferred: 8.2 Mt @ 1.45 g/t Au = 0.38 Moz

        Mineral Reserve Estimate:
        Proven: 10.5 Mt @ 2.25 g/t Au = 0.76 Moz
        Probable: 22.1 Mt @ 1.75 g/t Au = 1.24 Moz

        Economic Summary:
        NPV (5%): $485 million
        IRR: 28.5%
        Payback: 3.2 years
        Initial CAPEX: $320 million
        AISC: $1,150/oz
        Gold Price: $1,800/oz
        Mine Life: 12 years
        """

        parser_inst = NI43101Parser.__new__(NI43101Parser)
        estimates = parser_inst.parse_resource_estimates(sample)
        print(f"Found {len(estimates)} resource/reserve estimates")
        for e in estimates:
            print(f"  {e.category}: {e.tonnes_mt} Mt @ {e.grade} {e.grade_unit}")

        params = parser_inst.parse_economic_parameters(sample)
        print(f"\nEconomic Parameters:")
        print(f"  NPV: ${params.npv}M @ {params.npv_discount_rate}%")
        print(f"  IRR: {params.irr}%")
        print(f"  AISC: ${params.aisc_per_oz}/oz")

    elif args.pdf:
        parse_report_cli(args.pdf, output_json=args.json)

    else:
        print("NI 43-101 Technical Report Parser")
        print("=" * 40)
        print("\nUsage:")
        print("  python pdf_parser.py report.pdf      # Parse a report")
        print("  python pdf_parser.py report.pdf --json  # Output as JSON")
        print("  python pdf_parser.py --test          # Test with sample text")
        print("\nRequires PyMuPDF: pip install PyMuPDF")
