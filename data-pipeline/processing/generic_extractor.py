"""
Generic Metric Extractor using Fuzzy Matching.
Extracts mining metrics from text without company-specific regex.
"""

import logging
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

try:
    from rapidfuzz import fuzz, process
except ImportError:
    print("rapidfuzz not installed. Run: pip install rapidfuzz")
    process = None
    fuzz = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


@dataclass
class ExtractedMetric:
    """Represents an extracted metric."""
    metric_name: str
    metric_value: float
    unit: str
    confidence: float
    raw_text: str
    hole_id: Optional[str] = None
    interval: Optional[float] = None


class GenericExtractor:
    def __init__(self):
        # Comprehensive metrics map: "Clean Name" -> [variations]
        self.metrics_map = {
            # Production
            "Gold Production": ["Gold Production", "Au Production", "Ounces Produced", "Gold Output", "Au Output", "gold produced", "oz gold"],
            "Silver Production": ["Silver Production", "Ag Production", "Silver Output", "oz silver", "silver produced"],
            "Copper Production": ["Copper Production", "Cu Production", "Copper Output", "lbs copper", "copper produced"],
            "Nickel Production": ["Nickel Production", "Ni Production", "Nickel Output", "nickel produced"],

            # Costs
            "AISC": ["AISC", "All-In Sustaining Costs", "All-in Sustaining Cost", "Sustaining Costs", "all in sustaining"],
            "Cash Costs": ["Total Cash Costs", "Cash Operating Costs", "Cash Costs", "C1 Costs", "C1 cash cost"],

            # Grades
            "Gold Grade": ["Head Grade", "Average Grade", "Feed Grade", "Au Grade", "gold grade", "g/t Au", "grams per tonne"],
            "Copper Grade": ["Cu Grade", "Copper Grade", "% Cu", "percent copper"],
            "Nickel Grade": ["Ni Grade", "Nickel Grade", "% Ni", "percent nickel"],
            "TPM Grade": ["TPM", "Total Precious Metals", "Pt+Pd+Au", "PGM Grade", "precious metals grade"],

            # Resources
            "M&I Resources": ["Measured and Indicated", "Measured & Indicated", "M&I", "M+I Resources"],
            "Inferred Resources": ["Inferred Resources", "Inferred Resource", "Inferred"],
            "Proven Probable": ["Proven and Probable", "Proven & Probable", "P&P Reserves"],

            # Financial
            "Revenue": ["Revenue", "Revenues", "Total Revenue", "Net Revenue", "Sales"],
            "Net Income": ["Net Income", "Net Earnings", "Net Profit", "Earnings"],
            "EBITDA": ["EBITDA", "Adjusted EBITDA", "Operating EBITDA"],
        }

        # Unit mappings for standardization
        self.unit_map = {
            "Gold Production": "oz",
            "Silver Production": "oz",
            "Copper Production": "lbs",
            "Nickel Production": "lbs",
            "AISC": "$/oz",
            "Cash Costs": "$/oz",
            "Gold Grade": "g/t",
            "Copper Grade": "%",
            "Nickel Grade": "%",
            "TPM Grade": "g/t",
            "M&I Resources": "Moz",
            "Inferred Resources": "Moz",
            "Proven Probable": "Moz",
            "Revenue": "$M",
            "Net Income": "$M",
            "EBITDA": "$M",
        }
        
    def clean_number(self, text_snippet):
        """
        Extracts the first valid number from a snippet.
        Handles: "1,200", "$1,200", "1200 oz"
        """
        # Regex to find numbers: 1,234.56 or 1234
        match = re.search(r'[\$]?([\d,]+\.?\d*)', text_snippet)
        if match:
            num_str = match.group(1).replace(',', '')
            try:
                return float(num_str)
            except ValueError:
                return None
        return None

    def process_file(self, file_path):
        """
        Reads a file (txt/pdf) and extracts metrics.
        For prototype, we assume the file is text or has been converted to text.
        """
        if not os.path.exists(file_path):
            logging.error(f"File not found: {file_path}")
            return []
            
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            return self.extract_from_text(text)
        except Exception as e:
            logging.error(f"Failed to process {file_path}: {e}")
            return []

    def extract_from_text(self, text):
        results = []
        lines = text.split('\n')
        
        for metric_key, variations in self.metrics_map.items():
            # For each metric, find the best matching line in the text
            # We use 'process.extractOne' to find the best match of the VARIATIONS against the TEXT LINES
            # optimization: Scan lines? Or match keywords against lines?
            
            # Simple approach: Loop through lines, check fuzzy score against variations
            
            best_score = 0
            best_val = None
            best_line = ""
            
            for line in lines:
                if len(line.strip()) < 5: continue
                
                # Check this line against our variations
                # extraction return: (match, score, index)
                # We want to see if 'line' contains one of 'variations'
                # fuzz.partial_ratio is good for "finding needle in haystack"
                
                match = process.extractOne(line, variations, scorer=fuzz.partial_ratio)
                if match:
                    choice, score, idx = match
                    if score > 85: # High confidence trigger
                        # We found a line talking about this metric.
                        # Now look for the number in this line.
                        val = self.clean_number(line)
                        if val is not None:
                            if score > best_score:
                                best_score = score
                                best_val = val
                                best_line = line.strip()
            
            if best_val:
                results.append({
                    "metric": metric_key,
                    "value": best_val,
                    "confidence": best_score,
                    "snippet": best_line
                })
                
        return results

    def extract_drill_intercepts(self, text: str) -> List[Dict]:
        """
        Extract drill intercept data from tables.
        Handles common drill table formats.
        """
        results = []

        # Common drill hole ID patterns
        hole_patterns = [
            r'([A-Z]{2,4}-\d{2,4}-\d{2,4})',  # MCR-24-077, DDH-22-001
            r'([A-Z]{2,4}\d{4,6})',             # HOLE1234
        ]

        lines = text.split('\n')

        for line in lines:
            # Check if line looks like a table row (has pipes or multiple numbers)
            if '|' in line or len(re.findall(r'\d+\.?\d*', line)) >= 4:
                for pattern in hole_patterns:
                    hole_match = re.search(pattern, line)
                    if hole_match:
                        hole_id = hole_match.group(1)
                        numbers = re.findall(r'(\d+\.?\d*)', line)

                        if len(numbers) >= 4:
                            try:
                                # Common format: From, To, Interval, then grade values
                                interval = float(numbers[2]) if float(numbers[2]) < 1000 else None

                                results.append({
                                    "hole_id": hole_id,
                                    "interval": interval,
                                    "values": [float(n) for n in numbers],
                                    "raw_line": line.strip()
                                })
                            except (ValueError, IndexError):
                                pass
                        break

        return results

    def extract_all(self, text: str) -> Dict:
        """
        Extract all metrics and drill data from text.
        Returns comprehensive results dict.
        """
        return {
            "metrics": self.extract_from_text(text),
            "drill_intercepts": self.extract_drill_intercepts(text)
        }


# =============================================================================
# Standalone functions for pipeline integration
# =============================================================================

def extract_metrics_from_file(file_path: str) -> List[Dict]:
    """Convenience function to extract metrics from a file."""
    extractor = GenericExtractor()
    return extractor.process_file(file_path)


def extract_metrics_from_text(text: str) -> List[Dict]:
    """Convenience function to extract metrics from text."""
    extractor = GenericExtractor()
    return extractor.extract_from_text(text)


def extract_all_from_text(text: str) -> Dict:
    """Extract both metrics and drill data from text."""
    extractor = GenericExtractor()
    return extractor.extract_all(text)


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Extract mining metrics from text")
    parser.add_argument('--file', type=str, help="Path to text file to process")
    parser.add_argument('--test', action='store_true', help="Run with test data")

    args = parser.parse_args()

    extractor = GenericExtractor()

    if args.file:
        metrics = extractor.process_file(args.file)
        print(json.dumps(metrics, indent=2))

    elif args.test:
        # Test with sample mining text
        sample_text = """
        Magna Mining Reports Q4 Results.
        Highlights:
        - Gold Production was robust at 12,500 ounces.
        - All-In Sustaining Costs were reported at $1,150 per ounce.
        - Copper Output increased to 500 tonnes.
        - Our Head Grade averaged 3.5 g/t Au.
        - Measured and Indicated resources: 2.5 Moz Au.

        Drill Results Table:
        | Hole ID    | From (m) | To (m) | Interval (m) | Ni (%) | Cu (%) | TPM (g/t) |
        | MCR-24-077 | 45.0     | 60.0   | 15.0         | 0.20   | 0.20   | 18.20     |
        | MCR-24-052 | 10.5     | 13.6   | 3.1          | 0.80   | 2.90   | 5.90      |
        """

        print("="*60)
        print("GENERIC EXTRACTOR TEST")
        print("="*60)

        results = extractor.extract_all(sample_text)

        print("\n--- Metrics Found ---")
        print(json.dumps(results["metrics"], indent=2))

        print("\n--- Drill Intercepts Found ---")
        print(json.dumps(results["drill_intercepts"], indent=2))

    else:
        print("Usage:")
        print("  python generic_extractor.py --file <path>   # Process a file")
        print("  python generic_extractor.py --test          # Run with test data")
