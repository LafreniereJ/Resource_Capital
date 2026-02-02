import json
import os
import re
from typing import Dict, List, Optional

import fitz
from groq import Groq

from processing.structured_logger import get_logger

logger = get_logger(__name__)

class PDFExtractor:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            logger.warning("No GROQ_API_KEY found")
            self.client = None

    def extract_text(self, pdf_path: str, max_pages: int = None) -> str:
        """Extracts text from a PDF file (sequential)."""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        doc = fitz.open(pdf_path)
        text_content = []
        
        limit = min(max_pages, len(doc)) if max_pages else len(doc)
        logger.info("Parsing pages from PDF", pages=limit, file=os.path.basename(pdf_path))

        for i in range(limit):
            page = doc.load_page(i)
            text_content.append(page.get_text())

        return "\n".join(text_content)

    def extract_pages(self, pdf_path: str, page_numbers: List[int]) -> str:
        """Extracts text from specific page numbers (0-indexed)."""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        doc = fitz.open(pdf_path)
        text_content = []
        
        logger.debug("Scout surfacing pages", page_numbers=page_numbers)
        for p_num in page_numbers:
            if 0 <= p_num < len(doc):
                page = doc.load_page(p_num)
                text_content.append(page.get_text())
        
        return "\n".join(text_content)

    def scout_section_page(self, text_toc: str, section_keyword: str) -> Optional[int]:
        """
        Uses LLM to find the start page of a section from the Table of Contents.
        Returns: Page number (0-indexed) or None.
        """
        if not self.client: return None

        prompt = f"""
        Analyze this Table of Contents text and find the page number for "{section_keyword}".
        Return ONLY the integer page number. If not found, return -1.
        
        TOC Text:
        {text_toc[:10000]}
        """
        
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.0,
            )
            content = chat_completion.choices[0].message.content.strip()
            # Extract first number found
            match = re.search(r'\d+', content)
            if match:
                return int(match.group(0))
            return None
        except Exception as e:
            logger.warning("Scout failed", error=str(e))
            return None

    def find_section_heuristic(self, text: str, section_name: str) -> Optional[str]:
        """Smarter heuristic to find a section (Scan Mode)."""
        lower_text = text.lower()
        search_term = section_name.lower()
        
        # Find all occurrences
        start_indices = [m.start() for m in re.finditer(re.escape(search_term), lower_text)]
        
        if not start_indices:
            return None
            
        best_context = None
        best_score = -100
        
        for idx in start_indices:
            # Extract context
            context = text[idx:idx + 6000]
            lower_context = context.lower()
            
            # Scoring
            score = 0
            if "table" in lower_context[:500]: score += 10
            if "estimate" in lower_context[:200]: score += 5
            
            # Penalties
            if "forward-looking" in lower_context[:1000]: score -= 30
            if "cautionary" in lower_context[:1000]: score -= 30
            if "disclaimer" in lower_context[:1000]: score -= 30
            
            logger.debug("Scan match", match_idx=idx, score=score, snippet=lower_context[:30])
            
            if score > best_score:
                best_score = score
                best_context = context
        
        # Threshold to avoid bad matches
        if best_score < -10:
            logger.debug("Best match score too low, ignoring", score=best_score)
            return None

        return best_context

    def extract_mineral_inventory(self, pdf_path: str) -> List[Dict]:
        """
        Hybrid Strategy:
        1. Scout: Look for TOC -> Mineral Resources Page.
        2. Scan: If Scout fails, read whole doc (up to limit) and search.
        3. Extract: Use LLM to parse data.
        """
        if not self.client:
            logger.error("Groq client not initialized")
            return []

        target_text = ""
        
        # --- PHASE 1: SCOUT (Pages 0-15) ---
        logger.info("PHASE 1: SCOUT")
        toc_text = self.extract_text(pdf_path, max_pages=15)
        start_page = self.scout_section_page(toc_text, "Mineral Resource Estimates")
        
        if start_page and start_page > 0:
            logger.info("Scout found Mineral Resource Estimates", start_page=start_page)
            # Extract target page + 5 following pages
            target_text = self.extract_pages(pdf_path, list(range(start_page, start_page + 6)))
        else:
            logger.info("Scout failed to find section in TOC, switching to SCAN")
            # --- PHASE 2: SCAN ---
            # Read first 100 pages as fallback
            full_text = self.extract_text(pdf_path, max_pages=100)
            target_text = self.find_section_heuristic(full_text, "Mineral Resource")

        if not target_text:
            logger.warning("Failed to isolate target text")
            return []

        # --- PHASE 3: PARSE ---
        logger.info("PHASE 3: PARSE")
        prompt = f"""
        Extract the Mineral Resource Statement table from the text below into a JSON Array.
        
        RULES:
        1. Output ONLY valid JSON. No markdown, no explanations.
        2. Fields: category (Indicated/Inferred/Proven/Probable), tonnage_mt (float), grade (float), grade_unit (g/t, %), contained_metal (float), contained_metal_unit (Moz, Mlbs), commodity (Gold/Copper/etc).
        3. If multiple commodities exist, create separate entries.
        4. IGNORE text that is not a data table (e.g. paragraphs).
        
        TEXT CONTEXT:
        {target_text[:15000]} 
        
        JSON OUTPUT:
        """
        
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a mining database expert. Output only raw JSON array."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.0,
            )
            
            content = chat_completion.choices[0].message.content
            content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
            
        except Exception as e:
            logger.error("LLM Extraction failed", error=str(e))
            return []

    def extract_production_data(self, pdf_path: str) -> List[Dict]:
        """
        Extract quarterly/annual production metrics.
        Targets: gold_oz, AISC, cash costs, recovery rates, etc.
        Returns: List of dicts matching earnings table schema.
        """
        if not self.client:
            logger.error("Groq client not initialized")
            return []

        target_text = ""
        
        # --- PHASE 1: SCOUT (Pages 0-20 for quarterly reports) ---
        logger.info("PHASE 1: SCOUT (Production Data)")
        toc_text = self.extract_text(pdf_path, max_pages=20)
        
        # Try multiple section keywords
        keywords = ["Production Results", "Operating Results", "Operational Highlights", "Production Summary"]
        start_page = None
        
        for keyword in keywords:
            start_page = self.scout_section_page(toc_text, keyword)
            if start_page and start_page > 0:
                logger.info("Scout found section", keyword=keyword, start_page=start_page)
                break
        
        if start_page and start_page > 0:
            # Extract target page + 8 following pages (production tables often span multiple pages)
            target_text = self.extract_pages(pdf_path, list(range(start_page, start_page + 9)))
        else:
            logger.info("Scout failed to find production section, switching to SCAN")
            # --- PHASE 2: SCAN ---
            # For quarterly reports, read first 30 pages
            full_text = self.extract_text(pdf_path, max_pages=30)
            
            # Try heuristic search for production keywords
            for keyword in keywords:
                section = self.find_section_heuristic(full_text, keyword)
                if section:
                    target_text = section
                    break

        if not target_text:
            logger.warning("Failed to isolate production data text")
            return []

        # --- PHASE 3: PARSE ---
        logger.info("PHASE 3: PARSE (Production Data)")
        prompt = f"""
        Extract production data from this quarterly/annual report into a JSON Array.
        
        RULES:
        1. Output ONLY valid JSON. No markdown, no explanations.
        2. Fields: 
           - period (e.g., "Q3 2024", "FY 2024")
           - mine_name (if mine-level data available, else "Corporate")
           - gold_oz (float, gold production in ounces)
           - silver_oz (float, silver production in ounces)
           - copper_lbs (float, copper production in pounds)
           - gold_equivalent_oz (float, if available)
           - ore_processed_tonnes (float)
           - head_grade (float, average grade)
           - recovery_rate (float, percentage as decimal, e.g., 0.92 for 92%)
           - aisc_per_oz (float, All-In Sustaining Cost per oz)
           - cash_cost_per_oz (float)
        3. If multiple mines are reported, create separate entries.
        4. IGNORE text that is not production data (e.g. forward-looking statements).
        5. If a field is not available, use null.
        
        TEXT CONTEXT:
        {target_text[:15000]} 
        
        JSON OUTPUT:
        """
        
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a mining production data expert. Output only raw JSON array."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.0,
            )
            
            content = chat_completion.choices[0].message.content
            content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
            
        except Exception as e:
            logger.error("LLM Extraction failed", error=str(e))
            return []

if __name__ == "__main__":
    extractor = PDFExtractor()
    print("PDF Extractor initialized.")
