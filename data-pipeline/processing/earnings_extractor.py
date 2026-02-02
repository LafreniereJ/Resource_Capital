"""
Earnings Report Data Extractor
Extracts production metrics from earnings reports using LLM or pattern matching.

Supports:
- PDF reports (MD&A, quarterly reports)
- Text/HTML press releases
- Structured extraction via Claude API or local patterns
"""

import json
import logging
import os
import re
from dataclasses import asdict
from typing import Dict, List

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

# Import shared model
try:
    from models import ProductionData
except ImportError:
    from processing.models import ProductionData

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


class EarningsExtractor:
    """Extract production data from earnings reports."""

    # Extraction prompt for Claude
    EXTRACTION_PROMPT = """Extract production data from this mining company earnings report.

For each mine/operation mentioned, extract:
- Mine name
- Period (Q1 2024, Q2 2024, Annual 2024, etc.)
- Ore mined (tonnes)
- Ore processed/milled (tonnes)
- Head grade (g/t Au, % Cu, etc.)
- Recovery rate (%)
- Gold produced (oz)
- Silver produced (oz)
- Copper produced (lbs)
- AISC ($/oz)
- Cash cost ($/oz)

Return JSON array with one object per mine. Use null for missing values.
Example format:
[
  {
    "mine_name": "Canadian Malartic",
    "period": "Q3 2024",
    "ore_mined_tonnes": 5200000,
    "ore_processed_tonnes": 4850000,
    "head_grade": 1.12,
    "head_grade_unit": "g/t Au",
    "recovery_rate": 94.5,
    "gold_oz": 165432,
    "silver_oz": null,
    "copper_lbs": null,
    "aisc_per_oz": 1245,
    "cash_cost_per_oz": 892
  }
]

Report text:
"""

    def __init__(self, use_llm: bool = True):
        self.use_llm = use_llm and HAS_ANTHROPIC
        if self.use_llm:
            api_key = os.environ.get('ANTHROPIC_API_KEY')
            if api_key:
                self.client = anthropic.Anthropic(api_key=api_key)
            else:
                logging.warning("ANTHROPIC_API_KEY not set, falling back to pattern matching")
                self.use_llm = False

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF file."""
        if not HAS_PYMUPDF:
            raise ImportError("PyMuPDF required: pip install PyMuPDF")

        doc = fitz.open(pdf_path)
        text_parts = []

        for page in doc:
            text_parts.append(page.get_text())

        doc.close()
        return "\n".join(text_parts)

    def extract_with_llm(self, text: str, max_chars: int = 50000) -> List[ProductionData]:
        """Use Claude to extract structured data from text."""
        if not self.use_llm:
            raise RuntimeError("LLM extraction not available")

        # Truncate if too long
        if len(text) > max_chars:
            text = text[:max_chars]

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": self.EXTRACTION_PROMPT + text}
            ]
        )

        response_text = message.content[0].text

        # Parse JSON from response
        try:
            # Find JSON array in response
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                data = json.loads(json_match.group())
                return [ProductionData(**item) for item in data]
        except (json.JSONDecodeError, TypeError) as e:
            logging.error(f"Failed to parse LLM response: {e}")

        return []

    def extract_with_patterns(self, text: str) -> List[ProductionData]:
        """Extract data using regex patterns (fallback method)."""
        results = []

        # Find production sections
        sections = self._find_production_sections(text)

        for section in sections:
            data = ProductionData()

            # Try to identify mine name
            mine_match = re.search(
                r'(?:^|\n)([A-Z][A-Za-z\s\-]+(?:Mine|Project|Operations?))',
                section
            )
            if mine_match:
                data.mine_name = mine_match.group(1).strip()

            # Extract period
            period_match = re.search(
                r'(Q[1-4]\s*20\d{2}|(?:first|second|third|fourth)\s*quarter\s*20\d{2})',
                section, re.IGNORECASE
            )
            if period_match:
                data.period = period_match.group(1)

            # Extract gold production
            gold_match = re.search(
                r'(?:gold\s*(?:production|produced|output))[:\s]*(\d+(?:,\d{3})*)\s*(?:oz|ounces)',
                section, re.IGNORECASE
            )
            if gold_match:
                data.gold_oz = float(gold_match.group(1).replace(',', ''))

            # Extract ore processed
            ore_match = re.search(
                r'(?:ore\s*(?:processed|milled|throughput))[:\s]*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:t|tonnes?|mt)',
                section, re.IGNORECASE
            )
            if ore_match:
                data.ore_processed_tonnes = float(ore_match.group(1).replace(',', ''))

            # Extract head grade
            grade_match = re.search(
                r'(?:head\s*grade|grade)[:\s]*(\d+(?:\.\d+)?)\s*(g/t|gpt|%)',
                section, re.IGNORECASE
            )
            if grade_match:
                data.head_grade = float(grade_match.group(1))
                data.head_grade_unit = grade_match.group(2)

            # Extract AISC
            aisc_match = re.search(
                r'(?:aisc|all-in\s*sustaining)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)',
                section, re.IGNORECASE
            )
            if aisc_match:
                data.aisc_per_oz = float(aisc_match.group(1).replace(',', ''))

            # Extract cash cost
            cash_match = re.search(
                r'(?:cash\s*cost)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)',
                section, re.IGNORECASE
            )
            if cash_match:
                data.cash_cost_per_oz = float(cash_match.group(1).replace(',', ''))

            # Only add if we found meaningful data
            if data.gold_oz or data.ore_processed_tonnes or data.aisc_per_oz:
                results.append(data)

        return results

    def _find_production_sections(self, text: str) -> List[str]:
        """Find text sections likely to contain production data."""
        sections = []

        # Split by common section headers
        patterns = [
            r'(?:Operating|Production)\s*(?:Results|Summary|Highlights)',
            r'(?:Mine|Project)\s*(?:Operations?|Performance)',
            r'(?:Quarterly|Q[1-4])\s*(?:Results|Production)',
        ]

        for pattern in patterns:
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            for match in matches:
                # Extract ~2000 chars after the match
                start = match.start()
                end = min(len(text), start + 2000)
                sections.append(text[start:end])

        # If no sections found, use the whole text
        if not sections:
            sections = [text]

        return sections

    def extract_from_pdf(self, pdf_path: str) -> List[ProductionData]:
        """Extract production data from PDF file."""
        logging.info(f"Extracting from PDF: {pdf_path}")

        text = self.extract_text_from_pdf(pdf_path)
        logging.info(f"Extracted {len(text)} characters")

        if self.use_llm:
            return self.extract_with_llm(text)
        else:
            return self.extract_with_patterns(text)

    def extract_from_text(self, text: str, source_url: str = None) -> List[ProductionData]:
        """Extract production data from text content."""
        if self.use_llm:
            results = self.extract_with_llm(text)
        else:
            results = self.extract_with_patterns(text)

        # Add source URL to all results
        if source_url:
            for r in results:
                r.source_url = source_url

        return results

    def extract_from_url(self, url: str) -> List[ProductionData]:
        """Extract production data from a URL (press release, IR page)."""
        import requests
        from bs4 import BeautifulSoup

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Parse HTML and extract text
        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove script and style elements
        for element in soup(['script', 'style', 'nav', 'footer']):
            element.decompose()

        text = soup.get_text(separator='\n', strip=True)

        return self.extract_from_text(text, source_url=url)


def extract_from_file(file_path: str, use_llm: bool = True) -> List[Dict]:
    """CLI helper to extract from a file."""
    extractor = EarningsExtractor(use_llm=use_llm)

    if file_path.lower().endswith('.pdf'):
        results = extractor.extract_from_pdf(file_path)
    else:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        results = extractor.extract_from_text(text)

    return [asdict(r) for r in results]


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract production data from earnings reports")
    parser.add_argument("file", type=str, nargs="?", help="PDF or text file to extract from")
    parser.add_argument("--url", type=str, help="URL to extract from")
    parser.add_argument("--no-llm", action="store_true", help="Use pattern matching instead of LLM")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.file:
        results = extract_from_file(args.file, use_llm=not args.no_llm)

        if args.json:
            print(json.dumps(results, indent=2))
        else:
            print(f"\nExtracted {len(results)} production records:")
            for r in results:
                print(f"\n  Mine: {r.get('mine_name', 'Unknown')}")
                print(f"  Period: {r.get('period', 'N/A')}")
                if r.get('gold_oz'):
                    print(f"  Gold: {r['gold_oz']:,.0f} oz")
                if r.get('ore_processed_tonnes'):
                    print(f"  Ore Processed: {r['ore_processed_tonnes']:,.0f} t")
                if r.get('head_grade'):
                    print(f"  Grade: {r['head_grade']} {r.get('head_grade_unit', '')}")
                if r.get('aisc_per_oz'):
                    print(f"  AISC: ${r['aisc_per_oz']:,.0f}/oz")

    elif args.url:
        extractor = EarningsExtractor(use_llm=not args.no_llm)
        results = extractor.extract_from_url(args.url)

        if args.json:
            print(json.dumps([asdict(r) for r in results], indent=2))
        else:
            print(f"\nExtracted {len(results)} production records from URL")
            for r in results:
                print(f"  - {r.mine_name}: {r.gold_oz} oz @ ${r.aisc_per_oz}/oz AISC")

    else:
        print("Earnings Report Extractor")
        print("=" * 40)
        print("\nUsage:")
        print("  python earnings_extractor.py report.pdf")
        print("  python earnings_extractor.py report.pdf --no-llm")
        print("  python earnings_extractor.py --url https://company.com/news/q3-results")
        print("\nRequirements:")
        print("  - PyMuPDF: pip install PyMuPDF")
        print("  - For LLM: pip install anthropic")
        print("  - Set ANTHROPIC_API_KEY environment variable")
        print("\nThe extractor will:")
        print("  1. Parse PDF/HTML content")
        print("  2. Use Claude API to extract structured data (or regex fallback)")
        print("  3. Return production metrics per mine")
