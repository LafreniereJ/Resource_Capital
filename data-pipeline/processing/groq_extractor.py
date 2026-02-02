"""
Groq-based Earnings Extractor
Uses Groq's free API with Llama 3.1 for fast, cheap extraction.

Groq free tier: 30 requests/minute, 14,400 requests/day
Cost: Free tier covers most use cases, paid is ~$0.05/M tokens
"""

import json
import logging
import os
import re
from dataclasses import asdict
from pathlib import Path
from typing import List

# Load .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

# Import shared model
try:
    from models import ProductionData
except ImportError:
    from processing.models import ProductionData

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


class GroqExtractor:
    """Extract mining production data using Groq API."""

    EXTRACTION_PROMPT = """You are a mining industry data extraction assistant. Extract production data from this mining company report.

For EACH mine/operation mentioned, extract these fields:
- mine_name: Name of the mine or project
- period: Reporting period (e.g., "Q3 2024", "Q4 2024", "FY 2024")
- ore_mined_tonnes: Ore mined in tonnes (number only)
- ore_processed_tonnes: Ore processed/milled in tonnes (number only)
- head_grade: Head grade value (number only)
- head_grade_unit: Unit for head grade (e.g., "g/t Au", "% Cu")
- recovery_rate: Recovery rate as percentage (number only, e.g., 94.5)
- gold_oz: Gold produced in ounces (number only)
- silver_oz: Silver produced in ounces (number only)
- copper_lbs: Copper produced in pounds (number only)
- aisc_per_oz: All-in sustaining cost per ounce in USD (number only)
- cash_cost_per_oz: Cash cost per ounce in USD (number only)

Return ONLY a valid JSON array. Use null for missing values. Example:
[{"mine_name": "Example Mine", "period": "Q3 2024", "gold_oz": 50000, "aisc_per_oz": 1200, "ore_processed_tonnes": null}]

Report text:
"""

    def __init__(self):
        if not HAS_GROQ:
            raise ImportError("Groq library required: pip install groq")

        api_key = os.environ.get('GROQ_API_KEY')
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment")

        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"  # Latest Llama model on Groq

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

    def extract_from_text(self, text: str, source_url: str = None) -> List[ProductionData]:
        """Extract production data from text using Groq."""
        # Truncate if too long (Llama context is 128K but we want fast responses)
        max_chars = 30000
        if len(text) > max_chars:
            text = text[:max_chars]

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": self.EXTRACTION_PROMPT + text}
                ],
                temperature=0.1,  # Low temp for consistent extraction
                max_tokens=4096
            )

            response_text = response.choices[0].message.content

            # Parse JSON from response
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                data = json.loads(json_match.group())
                results = []
                for item in data:
                    item['source_url'] = source_url
                    results.append(ProductionData(**{k: v for k, v in item.items() if hasattr(ProductionData, k) or k == 'source_url'}))
                return results

        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse JSON: {e}")
        except Exception as e:
            logging.error(f"Groq API error: {e}")

        return []

    def extract_from_pdf(self, pdf_path: str) -> List[ProductionData]:
        """Extract production data from PDF file."""
        logging.info(f"Extracting from PDF: {pdf_path}")
        text = self.extract_text_from_pdf(pdf_path)
        logging.info(f"Extracted {len(text)} characters")
        return self.extract_from_text(text, source_url=pdf_path)

    def extract_from_url(self, url: str) -> List[ProductionData]:
        """Extract production data from a URL."""
        import requests
        from bs4 import BeautifulSoup

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }

        response = requests.get(url, timeout=30, headers=headers)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        for element in soup(['script', 'style', 'nav', 'footer', 'header']):
            element.decompose()

        text = soup.get_text(separator='\n', strip=True)
        return self.extract_from_text(text, source_url=url)


def test_extraction():
    """Test with sample earnings text."""
    sample = """
    Agnico Eagle Mines Limited
    Third Quarter 2024 Operating Results

    Canadian Malartic Complex
    Gold production: 165,432 ounces
    Ore processed: 4,850,000 tonnes
    Head grade: 1.12 g/t Au
    Recovery rate: 94.5%
    AISC: $1,245 per ounce
    Cash cost: $892 per ounce

    Detour Lake Mine
    Gold production of 178,543 oz
    Ore milled: 6,800,000 tonnes
    Head grade: 0.92 g/t
    Recovery: 91.2%
    All-in sustaining cost: $1,312/oz

    Macassa Mine
    Produced 98,234 ounces of gold
    Ore processed: 172,000 tonnes
    Head grade: 18.5 g/t Au
    Recovery rate: 97.1%
    AISC of $1,156 per oz
    """

    extractor = GroqExtractor()
    results = extractor.extract_from_text(sample)

    print(f"\nExtracted {len(results)} records:")
    for r in results:
        print(f"\n  Mine: {r.mine_name}")
        print(f"  Period: {r.period}")
        if r.gold_oz:
            print(f"  Gold: {r.gold_oz:,.0f} oz")
        if r.ore_processed_tonnes:
            print(f"  Ore: {r.ore_processed_tonnes:,.0f} t")
        if r.head_grade:
            print(f"  Grade: {r.head_grade} {r.head_grade_unit or ''}")
        if r.aisc_per_oz:
            print(f"  AISC: ${r.aisc_per_oz:,.0f}/oz")

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Groq-based Mining Data Extractor")
    parser.add_argument("input", type=str, nargs="?", help="PDF file or URL to extract from")
    parser.add_argument("--test", action="store_true", help="Run test with sample data")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.test:
        test_extraction()

    elif args.input:
        extractor = GroqExtractor()

        if args.input.startswith('http'):
            results = extractor.extract_from_url(args.input)
        elif args.input.endswith('.pdf'):
            results = extractor.extract_from_pdf(args.input)
        else:
            with open(args.input, 'r', encoding='utf-8') as f:
                results = extractor.extract_from_text(f.read())

        if args.json:
            print(json.dumps([asdict(r) for r in results], indent=2))
        else:
            print(f"\nExtracted {len(results)} records:")
            for r in results:
                print(f"\n  Mine: {r.mine_name}")
                if r.gold_oz:
                    print(f"  Gold: {r.gold_oz:,.0f} oz")
                if r.aisc_per_oz:
                    print(f"  AISC: ${r.aisc_per_oz:,.0f}/oz")

    else:
        print("Groq Mining Data Extractor")
        print("=" * 40)
        print("\nUsage:")
        print("  python groq_extractor.py --test")
        print("  python groq_extractor.py report.pdf")
        print("  python groq_extractor.py https://company.com/q3-results")
        print("\nRequires:")
        print("  - pip install groq PyMuPDF beautifulsoup4")
        print("  - GROQ_API_KEY in .env file")
