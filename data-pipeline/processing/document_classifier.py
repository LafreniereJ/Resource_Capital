"""
Document Classifier for Resource Capital Pipeline.
Auto-detects document types from PDF content using keyword matching and LLM classification.
"""

import os
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

import fitz
from groq import Groq


@dataclass
class ClassificationResult:
    """Result of document classification."""
    document_type: str  # 'technical_report', 'earnings', 'mda', 'press_release', 'other'
    document_subtype: Optional[str]  # 'NI 43-101', 'PEA', 'PFS', 'FS', 'Q1 2024', etc.
    confidence: float
    detected_ticker: Optional[str]
    detected_company: Optional[str]
    matched_keywords: List[str]


class DocumentClassifier:
    """Classifies PDF documents by type based on content analysis."""

    # Keyword patterns with weights for each document type
    TECHNICAL_REPORT_KEYWORDS = [
        ('ni 43-101', 1.0),
        ('national instrument 43-101', 1.0),
        ('technical report', 0.8),
        ('qualified person', 0.7),
        ('mineral resource estimate', 0.9),
        ('mineral reserve estimate', 0.9),
        ('mineral resource statement', 0.85),
        ('mineral reserve statement', 0.85),
        ('indicated resource', 0.6),
        ('inferred resource', 0.6),
        ('measured resource', 0.6),
        ('proven reserve', 0.6),
        ('probable reserve', 0.6),
    ]

    FEASIBILITY_KEYWORDS = {
        'FS': ['feasibility study', 'definitive feasibility', 'bankable feasibility'],
        'PFS': ['pre-feasibility', 'prefeasibility', 'pfs'],
        'PEA': ['preliminary economic assessment', 'pea', 'scoping study'],
    }

    EARNINGS_KEYWORDS = [
        ('production report', 0.9),
        ('quarterly results', 0.85),
        ('operating results', 0.8),
        ('quarterly production', 0.85),
        ('q1 production', 0.9),
        ('q2 production', 0.9),
        ('q3 production', 0.9),
        ('q4 production', 0.9),
        ('gold production', 0.7),
        ('ounces produced', 0.75),
        ('gold equivalent ounces', 0.8),
        ('aisc of', 0.7),
        ('all-in sustaining cost', 0.75),
    ]

    MDA_KEYWORDS = [
        ('management discussion', 0.9),
        ("management's discussion", 0.9),
        ('md&a', 0.95),
        ('analysis and discussion', 0.8),
        ('management report', 0.7),
    ]

    PRESS_RELEASE_KEYWORDS = [
        ('press release', 0.9),
        ('news release', 0.9),
        ('for immediate release', 0.95),
        ('announces', 0.5),
        ('reports', 0.4),
    ]

    # Ticker patterns
    TICKER_PATTERNS = [
        r'\(TSX:\s*([A-Z]{1,5})\)',
        r'\(TSXV:\s*([A-Z]{1,5})\)',
        r'\(TSX-V:\s*([A-Z]{1,5})\)',
        r'\(NYSE:\s*([A-Z]{1,5})\)',
        r'\(NASDAQ:\s*([A-Z]{1,5})\)',
        r'TSX:\s*([A-Z]{1,5})',
        r'TSXV:\s*([A-Z]{1,5})',
    ]

    def __init__(self, groq_api_key: str = None):
        """Initialize classifier with optional Groq API key for LLM classification."""
        self.api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                print(f"Warning: Could not initialize Groq client: {e}")

    def extract_preview_text(self, pdf_path: str, max_pages: int = 15) -> Tuple[str, int]:
        """Extract text from first N pages for classification. Returns (text, page_count)."""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        text_content = []

        limit = min(max_pages, total_pages)
        for i in range(limit):
            page = doc.load_page(i)
            text_content.append(page.get_text())

        doc.close()
        return "\n".join(text_content), total_pages

    def _score_keywords(self, text: str, keywords: List[Tuple[str, float]]) -> Tuple[float, List[str]]:
        """Score text against keyword list. Returns (score, matched_keywords)."""
        text_lower = text.lower()
        total_score = 0.0
        matched = []

        for keyword, weight in keywords:
            if keyword in text_lower:
                total_score += weight
                matched.append(keyword)

        return total_score, matched

    def _detect_subtype(self, text: str, doc_type: str) -> Optional[str]:
        """Detect document subtype based on content."""
        text_lower = text.lower()

        if doc_type == 'technical_report':
            # Check for feasibility study types
            for subtype, keywords in self.FEASIBILITY_KEYWORDS.items():
                for kw in keywords:
                    if kw in text_lower:
                        return subtype

            # Check for resource update
            if 'resource update' in text_lower or 'updated resource' in text_lower:
                return 'Resource Update'

            return 'NI 43-101'

        elif doc_type == 'earnings':
            # Try to detect quarter
            quarter_patterns = [
                (r'q([1-4])\s*20(\d{2})', lambda m: f"Q{m.group(1)} 20{m.group(2)}"),
                (r'first quarter\s*20(\d{2})', lambda m: f"Q1 20{m.group(1)}"),
                (r'second quarter\s*20(\d{2})', lambda m: f"Q2 20{m.group(1)}"),
                (r'third quarter\s*20(\d{2})', lambda m: f"Q3 20{m.group(1)}"),
                (r'fourth quarter\s*20(\d{2})', lambda m: f"Q4 20{m.group(1)}"),
            ]
            for pattern, formatter in quarter_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    return formatter(match)

        return None

    def _extract_ticker(self, text: str) -> Optional[str]:
        """Extract stock ticker from document text."""
        for pattern in self.TICKER_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).upper()
        return None

    def _extract_company_name(self, text: str) -> Optional[str]:
        """Try to extract company name from document header."""
        # Look for common patterns in first 2000 chars
        header = text[:2000]

        # Pattern: Company name followed by ticker
        patterns = [
            r'^([A-Z][A-Za-z\s&]+(?:Ltd|Inc|Corp|Corporation|Limited|Mining|Resources|Minerals|Gold|Exploration)?\.?)\s*\n',
            r'([A-Z][A-Za-z\s&]+(?:Ltd|Inc|Corp|Corporation|Limited|Mining|Resources|Minerals|Gold|Exploration)?\.?)\s*\((?:TSX|TSXV|NYSE)',
        ]

        for pattern in patterns:
            match = re.search(pattern, header)
            if match:
                name = match.group(1).strip()
                if len(name) > 3 and len(name) < 100:
                    return name

        return None

    def classify(self, pdf_path: str, use_llm_fallback: bool = True) -> ClassificationResult:
        """
        Classify a PDF document.

        Args:
            pdf_path: Path to the PDF file
            use_llm_fallback: Use LLM for classification if keyword matching is unclear

        Returns:
            ClassificationResult with document type, subtype, and metadata
        """
        # Extract preview text
        text, page_count = self.extract_preview_text(pdf_path)
        text_lower = text.lower()

        # Score each document type
        scores = {
            'technical_report': self._score_keywords(text, self.TECHNICAL_REPORT_KEYWORDS),
            'earnings': self._score_keywords(text, self.EARNINGS_KEYWORDS),
            'mda': self._score_keywords(text, self.MDA_KEYWORDS),
            'press_release': self._score_keywords(text, self.PRESS_RELEASE_KEYWORDS),
        }

        # Find best match
        best_type = max(scores.keys(), key=lambda k: scores[k][0])
        best_score, matched_keywords = scores[best_type]

        # Calculate confidence (normalize score)
        max_possible = sum(w for _, w in getattr(self, f"{best_type.upper()}_KEYWORDS", []))
        confidence = min(best_score / max(max_possible, 1) * 2, 1.0)  # Scale up, cap at 1.0

        # If confidence is low and LLM is available, use it
        if confidence < 0.4 and use_llm_fallback and self.client:
            llm_result = self._classify_with_llm(text[:8000])
            if llm_result:
                best_type = llm_result.get('type', best_type)
                confidence = llm_result.get('confidence', confidence)

        # Fallback to 'other' if very low confidence
        if confidence < 0.2:
            best_type = 'other'

        # Detect subtype
        subtype = self._detect_subtype(text, best_type)

        # Extract metadata
        ticker = self._extract_ticker(text)
        company = self._extract_company_name(text)

        return ClassificationResult(
            document_type=best_type,
            document_subtype=subtype,
            confidence=round(confidence, 3),
            detected_ticker=ticker,
            detected_company=company,
            matched_keywords=matched_keywords
        )

    def _classify_with_llm(self, text: str) -> Optional[dict]:
        """Use LLM to classify document when keyword matching is uncertain."""
        if not self.client:
            return None

        prompt = f"""Analyze this document excerpt and classify it into one of these types:
- technical_report: NI 43-101, feasibility studies, resource estimates
- earnings: Quarterly production reports, operating results
- mda: Management Discussion & Analysis
- press_release: News releases, announcements
- other: Cannot determine

Return JSON only: {{"type": "...", "confidence": 0.0-1.0}}

Document excerpt:
{text}"""

        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.0,
                max_tokens=100,
            )
            content = response.choices[0].message.content.strip()

            # Parse JSON from response
            import json

            # Handle potential markdown code blocks
            if '```' in content:
                content = re.search(r'\{[^}]+\}', content).group(0)
            return json.loads(content)
        except Exception as e:
            print(f"LLM classification failed: {e}")
            return None

    def get_page_count(self, pdf_path: str) -> int:
        """Get total page count of PDF."""
        doc = fitz.open(pdf_path)
        count = len(doc)
        doc.close()
        return count


# Convenience function
def classify_document(pdf_path: str) -> ClassificationResult:
    """Classify a PDF document. Convenience wrapper."""
    classifier = DocumentClassifier()
    return classifier.classify(pdf_path)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        result = classify_document(sys.argv[1])
        print(f"Type: {result.document_type}")
        print(f"Subtype: {result.document_subtype}")
        print(f"Confidence: {result.confidence}")
        print(f"Ticker: {result.detected_ticker}")
        print(f"Company: {result.detected_company}")
        print(f"Keywords: {result.matched_keywords}")
    else:
        print("Usage: python document_classifier.py <pdf_path>")
