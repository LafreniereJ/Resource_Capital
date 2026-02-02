"""
Table Extractor for NI 43-101 Technical Reports

Uses pdfplumber to extract and parse structured tables from mining technical reports.
Handles resource estimate tables and economic parameters tables.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    from models import EconomicParameters, ResourceEstimate
except ImportError:
    from processing.models import EconomicParameters, ResourceEstimate

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TableExtractor:
    """Extract and parse tables from NI 43-101 technical reports using pdfplumber."""

    # Keywords to identify resource/reserve tables
    RESOURCE_KEYWORDS = [
        'measured', 'indicated', 'inferred', 'proven', 'probable',
        'm+i', 'm&i', 'p+p', 'p&p', 'resource', 'reserve'
    ]

    # Keywords to identify economics tables
    ECONOMICS_KEYWORDS = [
        'npv', 'irr', 'payback', 'capex', 'opex', 'aisc',
        'net present value', 'internal rate', 'capital cost',
        'operating cost', 'cash flow', 'economic'
    ]

    # Unit patterns for parsing
    UNIT_PATTERNS = {
        'tonnes': r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:mt|m\s*t|million\s*t(?:onnes?)?|kt|k\s*t(?:onnes?)?)',
        'grade_gold': r'(\d+(?:\.\d+)?)\s*(?:g/t|gpt|grams?\s*per\s*tonne)',
        'grade_percent': r'(\d+(?:\.\d+)?)\s*%',
        'contained_oz': r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:moz|m\s*oz|million\s*(?:oz|ounces)|koz|k\s*oz)',
        'contained_lbs': r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:mlb|m\s*lb|billion\s*lb|blb)',
        'currency': r'\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:m|mm|million|b|billion)?',
    }

    # Table extraction settings optimized for mining reports
    TABLE_SETTINGS = {
        "vertical_strategy": "lines",
        "horizontal_strategy": "lines",
        "snap_tolerance": 3,
        "intersection_tolerance": 3,
        "edge_min_length": 3,
        "min_words_vertical": 2,
        "min_words_horizontal": 1,
    }

    # Alternative settings for tables without clear borders
    TABLE_SETTINGS_TEXT = {
        "vertical_strategy": "text",
        "horizontal_strategy": "text",
        "snap_tolerance": 5,
        "intersection_tolerance": 5,
    }

    def __init__(self):
        if not HAS_PDFPLUMBER:
            raise ImportError("pdfplumber is required. Install with: pip install pdfplumber")

    def extract_from_pdf(
        self,
        pdf_path: str,
        page_range: Optional[Tuple[int, int]] = None
    ) -> Dict[str, Any]:
        """
        Extract all tables from a PDF and classify them.

        Args:
            pdf_path: Path to the PDF file
            page_range: Optional (start, end) page numbers (0-indexed)

        Returns:
            Dict with 'resource_estimates', 'economic_parameters', 'raw_tables'
        """
        logger.info(f"Extracting tables from: {pdf_path}")

        results = {
            'resource_estimates': [],
            'economic_parameters': None,
            'raw_tables': [],
            'pages_processed': 0,
            'tables_found': 0,
        }

        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            start_page = page_range[0] if page_range else 0
            end_page = page_range[1] if page_range else total_pages

            for page_num in range(start_page, min(end_page, total_pages)):
                page = pdf.pages[page_num]
                page_tables = self._extract_page_tables(page, page_num)

                for table_data in page_tables:
                    results['raw_tables'].append(table_data)
                    results['tables_found'] += 1

                    # Classify and parse the table
                    table_type = self._classify_table(table_data['data'])

                    if table_type == 'resource':
                        estimates = self._parse_resource_table(table_data['data'])
                        results['resource_estimates'].extend(estimates)
                        logger.info(f"Page {page_num + 1}: Found resource table with {len(estimates)} estimates")

                    elif table_type == 'economics':
                        params = self._parse_economics_table(table_data['data'])
                        if params and (params.npv or params.irr):
                            results['economic_parameters'] = params
                            logger.info(f"Page {page_num + 1}: Found economics table")

                results['pages_processed'] += 1

        logger.info(f"Extraction complete: {results['tables_found']} tables, "
                   f"{len(results['resource_estimates'])} resource estimates")

        return results

    def _extract_page_tables(self, page, page_num: int) -> List[Dict]:
        """Extract all tables from a single page."""
        tables = []

        # Try with line-based detection first
        extracted = page.extract_tables(table_settings=self.TABLE_SETTINGS)

        # If no tables found, try text-based detection
        if not extracted:
            extracted = page.extract_tables(table_settings=self.TABLE_SETTINGS_TEXT)

        for i, table in enumerate(extracted):
            if table and len(table) > 1:  # At least header + one data row
                tables.append({
                    'page': page_num,
                    'table_index': i,
                    'data': table,
                    'row_count': len(table),
                    'col_count': len(table[0]) if table else 0,
                })

        return tables

    def _classify_table(self, table: List[List[str]]) -> Optional[str]:
        """
        Classify a table as 'resource', 'economics', or None.

        Args:
            table: List of rows, each row is a list of cell strings

        Returns:
            'resource', 'economics', or None
        """
        if not table or len(table) < 2:
            return None

        # Flatten first few rows for keyword search
        sample_text = ' '.join(
            str(cell).lower()
            for row in table[:4]
            for cell in row if cell
        )

        # Check for resource table keywords
        resource_score = sum(
            1 for kw in self.RESOURCE_KEYWORDS
            if kw in sample_text
        )

        # Check for economics table keywords
        economics_score = sum(
            1 for kw in self.ECONOMICS_KEYWORDS
            if kw in sample_text
        )

        if resource_score >= 2:
            return 'resource'
        elif economics_score >= 2:
            return 'economics'

        return None

    def _parse_resource_table(self, table: List[List[str]]) -> List[ResourceEstimate]:
        """
        Parse a resource/reserve estimate table.

        Expected formats:
        - Category | Tonnes | Grade | Contained Metal
        - Category | Tonnes (Mt) | Grade (g/t) | Ounces (Moz)
        - Inline format: "12.5 Mt @ 2.35 g/t = 0.95 Moz"
        """
        estimates = []

        if not table or len(table) < 2:
            return estimates

        # Try to identify column indices from header
        header = [str(cell).lower() if cell else '' for cell in table[0]]
        col_map = self._identify_resource_columns(header)

        # Process data rows
        for row_idx, row in enumerate(table[1:], start=1):
            if not row or len(row) < 2:
                continue

            # Get category from first column or identified column
            category_col = col_map.get('category', 0)
            category_text = str(row[category_col]).strip() if len(row) > category_col and row[category_col] else ''

            # Check if this row contains a resource category
            category = self._extract_category(category_text)
            if not category:
                # Try to find category in any cell (for merged cell tables)
                for cell in row:
                    if cell:
                        category = self._extract_category(str(cell))
                        if category:
                            break

            if not category:
                continue

            estimate = ResourceEstimate(
                category=category,
                is_reserve=category.lower() in ['proven', 'probable', 'proven+probable', 'p+p']
            )

            # Extract tonnes
            tonnes_col = col_map.get('tonnes')
            if tonnes_col is not None and len(row) > tonnes_col:
                estimate.tonnes_mt = self._parse_number(row[tonnes_col])

            # Extract grade
            grade_col = col_map.get('grade')
            if grade_col is not None and len(row) > grade_col:
                grade_val, grade_unit = self._parse_grade(row[grade_col])
                estimate.grade = grade_val
                estimate.grade_unit = grade_unit

            # Extract contained metal
            contained_col = col_map.get('contained')
            if contained_col is not None and len(row) > contained_col:
                contained_val, contained_unit = self._parse_contained(row[contained_col])
                estimate.contained_metal = contained_val
                estimate.contained_metal_unit = contained_unit

            # If structured parsing didn't work, try inline extraction from all cells
            if not estimate.tonnes_mt and not estimate.contained_metal:
                inline_estimate = self._extract_inline_resource(row)
                if inline_estimate:
                    estimate.tonnes_mt = inline_estimate.get('tonnes_mt')
                    estimate.grade = inline_estimate.get('grade')
                    estimate.grade_unit = inline_estimate.get('grade_unit')
                    estimate.contained_metal = inline_estimate.get('contained_metal')
                    estimate.contained_metal_unit = inline_estimate.get('contained_metal_unit')

            # Only add if we have meaningful data
            if estimate.tonnes_mt or estimate.contained_metal:
                estimates.append(estimate)
                logger.debug(f"Parsed estimate: {category} - {estimate.tonnes_mt} Mt @ {estimate.grade} {estimate.grade_unit}")

        # If no estimates found from table structure, try text extraction from all cells
        if not estimates:
            estimates = self._extract_from_table_text(table)

        return estimates

    def _extract_inline_resource(self, row: List[str]) -> Optional[Dict]:
        """
        Extract resource data from inline text format.

        Handles formats like:
        - "12.5 Mt @ 2.35 g/t = 0.95 Moz"
        - "12,500 tonnes grading 2.35 g/t containing 0.95 million ounces"
        """
        # Combine all cells into one text block
        text = ' '.join(str(cell) for cell in row if cell)

        result = {}

        # Pattern: tonnes Mt/million tonnes
        tonnes_match = re.search(
            r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:mt|m\s*t|million\s*t(?:onnes?)?)',
            text, re.IGNORECASE
        )
        if tonnes_match:
            result['tonnes_mt'] = float(tonnes_match.group(1).replace(',', ''))

        # Pattern: grade g/t
        grade_match = re.search(
            r'(\d+(?:\.\d+)?)\s*(?:g/t|gpt|grams?\s*per\s*tonne)',
            text, re.IGNORECASE
        )
        if grade_match:
            result['grade'] = float(grade_match.group(1))
            result['grade_unit'] = 'g/t'

        # Pattern: grade %
        if not grade_match:
            pct_match = re.search(r'(\d+(?:\.\d+)?)\s*%', text)
            if pct_match:
                result['grade'] = float(pct_match.group(1))
                result['grade_unit'] = '%'

        # Pattern: contained ounces (Moz, koz)
        oz_match = re.search(
            r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:moz|m\s*oz|million\s*(?:oz|ounces))',
            text, re.IGNORECASE
        )
        if oz_match:
            result['contained_metal'] = float(oz_match.group(1).replace(',', ''))
            result['contained_metal_unit'] = 'Moz'

        return result if result else None

    def _extract_from_table_text(self, table: List[List[str]]) -> List[ResourceEstimate]:
        """
        Extract resource estimates by scanning all table text.

        Used when structured table parsing fails (e.g., merged cells, complex layouts).
        """
        estimates = []

        # Combine all table text
        all_text = '\n'.join(
            ' '.join(str(cell) for cell in row if cell)
            for row in table
        )

        # Pattern for inline resource statements
        # E.g., "Measured: 12.5 Mt @ 2.35 g/t Au = 0.95 Moz"
        pattern = re.compile(
            r'(Measured|Indicated|Inferred|Proven|Probable|M\s*[+&]\s*I|P\s*[+&]\s*P)'
            r'[:\s]*'
            r'(?:.*?)'  # Allow some text between category and numbers
            r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:Mt|M\s*t|million\s*t(?:onnes?)?)'
            r'(?:.*?)'  # Flexible separator
            r'(\d+(?:\.\d+)?)\s*(g/t|gpt|%)'
            r'(?:.*?)'  # Flexible separator
            r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(Moz|koz|Mlb)?',
            re.IGNORECASE | re.DOTALL
        )

        for match in pattern.finditer(all_text):
            category_raw = match.group(1).strip()
            tonnes = float(match.group(2).replace(',', ''))
            grade = float(match.group(3))
            grade_unit = match.group(4).lower()
            contained = float(match.group(5).replace(',', '')) if match.group(5) else None
            contained_unit = match.group(6) or 'Moz'

            # Normalize category
            category = self._normalize_category(category_raw)

            estimate = ResourceEstimate(
                category=category,
                is_reserve=category.lower() in ['proven', 'probable', 'proven+probable'],
                tonnes_mt=tonnes,
                grade=grade,
                grade_unit=grade_unit,
                contained_metal=contained,
                contained_metal_unit=contained_unit
            )
            estimates.append(estimate)

        return estimates

    def _normalize_category(self, category_raw: str) -> str:
        """Normalize resource category name."""
        category = category_raw.strip()
        if re.match(r'm\s*[+&]\s*i', category, re.IGNORECASE):
            return 'Measured+Indicated'
        elif re.match(r'p\s*[+&]\s*p', category, re.IGNORECASE):
            return 'Proven+Probable'
        else:
            return category.title()

    def _identify_resource_columns(self, header: List[str]) -> Dict[str, int]:
        """Identify column indices from header row."""
        col_map = {}

        for i, cell in enumerate(header):
            cell_lower = cell.lower()

            # Category column (usually first)
            if i == 0 or 'category' in cell_lower or 'class' in cell_lower:
                col_map['category'] = i

            # Tonnes column
            if any(kw in cell_lower for kw in ['tonne', 'tonnage', 'mt', 'kt', 'ton']):
                col_map['tonnes'] = i

            # Grade column
            if any(kw in cell_lower for kw in ['grade', 'g/t', 'gpt', '%']):
                col_map['grade'] = i

            # Contained metal column
            if any(kw in cell_lower for kw in ['contain', 'metal', 'oz', 'ounce', 'moz', 'lb']):
                col_map['contained'] = i

        # Default assignments if not found
        if 'category' not in col_map:
            col_map['category'] = 0
        if 'tonnes' not in col_map and len(header) > 1:
            col_map['tonnes'] = 1
        if 'grade' not in col_map and len(header) > 2:
            col_map['grade'] = 2
        if 'contained' not in col_map and len(header) > 3:
            col_map['contained'] = 3

        return col_map

    def _extract_category(self, text: str) -> Optional[str]:
        """Extract resource/reserve category from text."""
        text_lower = text.lower().strip()

        # Combined categories
        if re.search(r'm\s*[+&]\s*i|measured\s*[+&]\s*indicated', text_lower):
            return 'Measured+Indicated'
        if re.search(r'p\s*[+&]\s*p|proven\s*[+&]\s*probable', text_lower):
            return 'Proven+Probable'

        # Individual categories
        categories = {
            'measured': 'Measured',
            'indicated': 'Indicated',
            'inferred': 'Inferred',
            'proven': 'Proven',
            'proved': 'Proven',
            'probable': 'Probable',
        }

        for keyword, category in categories.items():
            if keyword in text_lower:
                # Make sure it's not part of "measured+indicated"
                if keyword == 'measured' and 'indicated' in text_lower:
                    continue
                if keyword == 'indicated' and 'measured' in text_lower:
                    continue
                return category

        return None

    def _parse_economics_table(self, table: List[List[str]]) -> Optional[EconomicParameters]:
        """
        Parse an economics/feasibility table.

        Expected formats:
        - Parameter | Value | Unit
        - Key metric rows with values
        """
        params = EconomicParameters()

        if not table or len(table) < 2:
            return None

        # Flatten table for keyword extraction
        for row in table:
            if not row or len(row) < 2:
                continue

            row_text = ' '.join(str(cell).lower() for cell in row if cell)

            # NPV
            if 'npv' in row_text or 'net present value' in row_text:
                for cell in row[1:]:
                    val = self._parse_currency(cell)
                    if val:
                        params.npv = val
                        break
                # Look for discount rate
                rate_match = re.search(r'(\d+(?:\.\d+)?)\s*%', row_text)
                if rate_match:
                    params.npv_discount_rate = float(rate_match.group(1))

            # IRR
            if 'irr' in row_text or 'internal rate' in row_text:
                for cell in row[1:]:
                    val = self._parse_percentage(cell)
                    if val:
                        params.irr = val
                        break

            # Payback
            if 'payback' in row_text:
                for cell in row[1:]:
                    val = self._parse_number(cell)
                    if val and val < 50:  # Sanity check for years
                        params.payback_years = val
                        break

            # CAPEX
            if 'capex' in row_text or 'capital' in row_text:
                if 'sustaining' in row_text:
                    for cell in row[1:]:
                        val = self._parse_currency(cell)
                        if val:
                            params.capex_sustaining = val
                            break
                elif 'initial' in row_text or not params.capex_initial:
                    for cell in row[1:]:
                        val = self._parse_currency(cell)
                        if val:
                            params.capex_initial = val
                            break

            # AISC
            if 'aisc' in row_text or 'all-in' in row_text:
                for cell in row[1:]:
                    val = self._parse_currency(cell)
                    if val:
                        params.aisc_per_oz = val
                        break

            # Gold price assumption
            if 'gold' in row_text and 'price' in row_text:
                for cell in row[1:]:
                    val = self._parse_currency(cell)
                    if val:
                        params.gold_price_assumption = val
                        break

            # Mine life
            if 'mine life' in row_text or 'lom' in row_text:
                for cell in row[1:]:
                    val = self._parse_number(cell)
                    if val and val < 100:  # Sanity check for years
                        params.mine_life_years = val
                        break

        return params

    def _parse_number(self, value: Any) -> Optional[float]:
        """Parse a numeric value, handling commas and units."""
        if value is None:
            return None

        text = str(value).strip()
        if not text:
            return None

        # Remove currency symbols and common prefixes
        text = re.sub(r'[$€£]', '', text)

        # Extract number with optional decimals
        match = re.search(r'(-?\d+(?:,\d{3})*(?:\.\d+)?)', text)
        if match:
            num_str = match.group(1).replace(',', '')
            try:
                result = float(num_str)

                # Check for multipliers in surrounding text
                text_lower = text.lower()
                if 'billion' in text_lower or text_lower.endswith('b'):
                    result *= 1000
                elif 'million' in text_lower or text_lower.endswith('m'):
                    pass  # Already in millions
                elif 'thousand' in text_lower or text_lower.endswith('k'):
                    result /= 1000

                return result
            except ValueError:
                return None

        return None

    def _parse_grade(self, value: Any) -> Tuple[Optional[float], Optional[str]]:
        """Parse grade value and determine unit."""
        if value is None:
            return None, None

        text = str(value).strip()

        # Look for g/t pattern
        match = re.search(r'(\d+(?:\.\d+)?)\s*(g/t|gpt)?', text, re.IGNORECASE)
        if match:
            grade = float(match.group(1))
            unit = match.group(2) or 'g/t'
            return grade, unit.lower()

        # Look for percentage
        match = re.search(r'(\d+(?:\.\d+)?)\s*%', text)
        if match:
            return float(match.group(1)), '%'

        # Just a number
        num = self._parse_number(text)
        if num is not None:
            return num, 'g/t'  # Default assumption

        return None, None

    def _parse_contained(self, value: Any) -> Tuple[Optional[float], Optional[str]]:
        """Parse contained metal value and unit."""
        if value is None:
            return None, None

        text = str(value).strip().lower()

        # Moz (million ounces)
        match = re.search(r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:moz|m\s*oz)', text)
        if match:
            return float(match.group(1).replace(',', '')), 'Moz'

        # koz (thousand ounces)
        match = re.search(r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:koz|k\s*oz)', text)
        if match:
            return float(match.group(1).replace(',', '')) / 1000, 'Moz'

        # Mlb (million pounds)
        match = re.search(r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:mlb|m\s*lb)', text)
        if match:
            return float(match.group(1).replace(',', '')), 'Mlb'

        # Just a number - assume Moz
        num = self._parse_number(value)
        if num is not None:
            return num, 'Moz'

        return None, None

    def _parse_currency(self, value: Any) -> Optional[float]:
        """Parse currency value (assumes millions unless otherwise specified)."""
        if value is None:
            return None

        text = str(value).strip()

        # Remove currency symbols
        text = re.sub(r'[$€£]', '', text)

        # Extract number
        match = re.search(r'(-?\d+(?:,\d{3})*(?:\.\d+)?)', text)
        if match:
            num = float(match.group(1).replace(',', ''))

            # Check for multipliers
            text_lower = text.lower()
            if 'billion' in text_lower:
                num *= 1000
            elif 'thousand' in text_lower:
                num /= 1000

            return num

        return None

    def _parse_percentage(self, value: Any) -> Optional[float]:
        """Parse percentage value."""
        if value is None:
            return None

        text = str(value).strip()
        match = re.search(r'(\d+(?:\.\d+)?)\s*%?', text)
        if match:
            return float(match.group(1))

        return None

    def find_resource_pages(self, pdf_path: str) -> List[int]:
        """
        Find pages likely to contain resource estimate tables.

        Args:
            pdf_path: Path to PDF

        Returns:
            List of page numbers (0-indexed)
        """
        resource_pages = []

        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ''
                text_lower = text.lower()

                # Look for resource section indicators
                if any(kw in text_lower for kw in [
                    'mineral resource estimate',
                    'resource statement',
                    'mineral reserve',
                    'resource summary',
                    'measured and indicated',
                ]):
                    resource_pages.append(i)

        return resource_pages

    def find_economics_pages(self, pdf_path: str) -> List[int]:
        """
        Find pages likely to contain economics tables.

        Args:
            pdf_path: Path to PDF

        Returns:
            List of page numbers (0-indexed)
        """
        economics_pages = []

        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ''
                text_lower = text.lower()

                # Look for economics section indicators
                if any(kw in text_lower for kw in [
                    'economic analysis',
                    'financial analysis',
                    'project economics',
                    'cash flow',
                    'npv',
                    'internal rate of return',
                ]):
                    economics_pages.append(i)

        return economics_pages


def extract_tables_cli(pdf_path: str, output_json: bool = False) -> Dict:
    """CLI function to extract tables from a PDF."""
    extractor = TableExtractor()
    results = extractor.extract_from_pdf(pdf_path)

    if output_json:
        import json

        # Convert dataclasses to dicts for JSON serialization
        output = {
            'pages_processed': results['pages_processed'],
            'tables_found': results['tables_found'],
            'resource_estimates': [e.to_dict() for e in results['resource_estimates']],
            'economic_parameters': results['economic_parameters'].to_dict() if results['economic_parameters'] else None,
        }
        print(json.dumps(output, indent=2))
    else:
        print(f"\nPDF: {pdf_path}")
        print("=" * 60)
        print(f"Pages processed: {results['pages_processed']}")
        print(f"Tables found: {results['tables_found']}")

        if results['resource_estimates']:
            print(f"\nResource/Reserve Estimates ({len(results['resource_estimates'])}):")
            for est in results['resource_estimates']:
                tonnes = f"{est.tonnes_mt:.1f} Mt" if est.tonnes_mt else "N/A"
                grade = f"{est.grade:.2f} {est.grade_unit}" if est.grade else "N/A"
                contained = f"{est.contained_metal:.2f} {est.contained_metal_unit}" if est.contained_metal else "N/A"
                reserve_tag = " [RESERVE]" if est.is_reserve else ""
                print(f"  {est.category}{reserve_tag}: {tonnes} @ {grade} = {contained}")

        if results['economic_parameters']:
            print("\nEconomic Parameters:")
            params = results['economic_parameters']
            if params.npv:
                rate = f" @ {params.npv_discount_rate}%" if params.npv_discount_rate else ""
                print(f"  NPV{rate}: ${params.npv:.0f}M")
            if params.irr:
                print(f"  IRR: {params.irr:.1f}%")
            if params.payback_years:
                print(f"  Payback: {params.payback_years:.1f} years")
            if params.capex_initial:
                print(f"  Initial CAPEX: ${params.capex_initial:.0f}M")
            if params.aisc_per_oz:
                print(f"  AISC: ${params.aisc_per_oz:.0f}/oz")
            if params.mine_life_years:
                print(f"  Mine Life: {params.mine_life_years:.0f} years")

    return results


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="NI 43-101 Table Extractor")
    parser.add_argument("pdf", type=str, nargs="?", help="Path to PDF file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--pages", type=str, help="Page range (e.g., '10-20')")
    parser.add_argument("--find-resources", action="store_true", help="Find pages with resource tables")
    parser.add_argument("--find-economics", action="store_true", help="Find pages with economics tables")

    args = parser.parse_args()

    if not args.pdf:
        print("NI 43-101 Table Extractor")
        print("=" * 40)
        print("\nUsage:")
        print("  python table_extractor.py report.pdf           # Extract all tables")
        print("  python table_extractor.py report.pdf --json    # Output as JSON")
        print("  python table_extractor.py report.pdf --pages 10-20  # Specific pages")
        print("  python table_extractor.py report.pdf --find-resources  # Find resource pages")
        print("\nRequires pdfplumber: pip install pdfplumber")
        sys.exit(0)

    extractor = TableExtractor()

    if args.find_resources:
        pages = extractor.find_resource_pages(args.pdf)
        print(f"Resource pages: {pages}")
    elif args.find_economics:
        pages = extractor.find_economics_pages(args.pdf)
        print(f"Economics pages: {pages}")
    else:
        page_range = None
        if args.pages:
            start, end = args.pages.split('-')
            page_range = (int(start) - 1, int(end))  # Convert to 0-indexed

        extract_tables_cli(args.pdf, output_json=args.json)
