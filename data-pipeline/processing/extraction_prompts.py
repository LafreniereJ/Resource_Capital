"""
Extraction Prompts for Mining Data Pipeline
Optimized LLM prompts for extracting production, reserves, and economics data.
"""

# =============================================================================
# PRODUCTION EXTRACTION PROMPT
# =============================================================================

PRODUCTION_EXTRACTION_PROMPT = """You are a mining industry data extraction expert. Extract quarterly production metrics from this mining company document.

EXTRACT THE FOLLOWING METRICS (if present):
1. **Production Period**: Quarter and year (e.g., "Q3 2025")
2. **Throughput**: Tonnes processed per day (tpd) and/or per year
3. **Metal Production**:
   - Gold (oz)
   - Silver (oz)
   - Copper (lbs)
   - Nickel (lbs)
   - Platinum (oz)
   - Palladium (oz)
   - Uranium (lbs U3O8)
4. **Equivalent Production**:
   - Gold equivalent ounces (GEO or AuEq oz)
   - Copper equivalent pounds (CuEq lbs)
5. **Cost Metrics**:
   - AISC per oz (All-in Sustaining Cost)
   - Cash cost per oz (C1)
   - Mining cost per tonne
   
OUTPUT FORMAT (JSON array):
```json
[
  {
    "project_name": "Mine/Project Name",
    "period": "Q3 2025",
    "throughput_tpd": 15000,
    "gold_produced_oz": 50000,
    "silver_produced_oz": 200000,
    "copper_produced_lbs": null,
    "nickel_produced_lbs": null,
    "uranium_produced_lbs": null,
    "gold_equivalent_oz": 55000,
    "aisc_per_oz": 1250,
    "cash_cost_per_oz": 850,
    "mining_cost_per_tonne": 45.50,
    "confidence": 0.95
  }
]
```

RULES:
- Extract ONLY explicitly stated values, do not calculate or infer
- Use null for missing values
- Confidence should be 0.9+ for clearly stated values, lower for ambiguous
- If multiple projects/mines mentioned, create separate entries for each
- Convert all units to standard: oz for precious metals, lbs for base metals

DOCUMENT TEXT:
{document_text}

Extract the production data as JSON:"""


# =============================================================================
# RESERVES/RESOURCES EXTRACTION PROMPT
# =============================================================================

RESERVES_EXTRACTION_PROMPT = """You are a mining industry data extraction expert. Extract mineral reserve and resource estimates from this document.

EXTRACT THE FOLLOWING (NI 43-101 classifications):

**RESERVES (Economically mineable):**
- Proven Reserves
- Probable Reserves

**RESOURCES (Geological estimate):**
- Measured Resources
- Indicated Resources
- Inferred Resources

FOR EACH CATEGORY, EXTRACT:
- Tonnes (Mt or kt)
- Grade (g/t for gold/silver, % for copper/nickel/uranium)
- Contained metal (oz for precious, lbs/tonnes for base metals)
- Primary commodity

OUTPUT FORMAT (JSON array):
```json
[
  {
    "project_name": "Deposit/Project Name",
    "deposit_name": "Specific zone if applicable",
    "category": "proven",
    "is_reserve": true,
    "tonnes_mt": 25.5,
    "grade": 1.45,
    "grade_unit": "g/t Au",
    "contained_oz": 1190000,
    "commodity": "gold",
    "report_date": "2025-03-15",
    "confidence": 0.95
  },
  {
    "project_name": "Deposit/Project Name",
    "category": "measured",
    "is_reserve": false,
    "tonnes_mt": 45.2,
    "grade": 0.85,
    "grade_unit": "% Cu",
    "contained_lbs": 850000000,
    "commodity": "copper",
    "confidence": 0.90
  }
]
```

RULES:
- Only extract explicitly stated values
- Map to NI 43-101 categories: proven, probable, measured, indicated, inferred
- Reserves have is_reserve=true, Resources have is_reserve=false
- Include deposit/zone name if specific areas are mentioned
- Note the report/effective date if stated

DOCUMENT TEXT:
{document_text}

Extract the reserves and resources as JSON:"""


# =============================================================================
# ECONOMICS EXTRACTION PROMPT
# =============================================================================

ECONOMICS_EXTRACTION_PROMPT = """You are a mining industry data extraction expert. Extract project economics from this technical study or feasibility report.

IDENTIFY THE STUDY TYPE:
- PEA (Preliminary Economic Assessment)
- PFS (Pre-Feasibility Study)
- DFS/FS (Definitive Feasibility Study)

EXTRACT THE FOLLOWING METRICS:
1. **Valuation Metrics**:
   - NPV (Net Present Value) in $ millions
   - Discount rate used (%)
   - IRR (Internal Rate of Return) %
   - Payback period (years)

2. **Capital Costs**:
   - Initial CapEx ($ millions)
   - Sustaining CapEx ($ millions)

3. **Operating Costs**:
   - OpEx per tonne processed
   - AISC per oz (if gold project)

4. **Assumptions**:
   - Metal price assumptions (gold $/oz, copper $/lb, etc.)
   - Mine life (years)
   - Annual production target

OUTPUT FORMAT (JSON):
```json
{
  "project_name": "Project Name",
  "study_type": "pfs",
  "study_date": "2025-06-15",
  "npv_million": 850.5,
  "npv_discount_rate": 5.0,
  "irr_percent": 28.5,
  "payback_years": 3.2,
  "initial_capex_million": 450.0,
  "sustaining_capex_million": 125.0,
  "opex_per_tonne": 85.50,
  "mine_life_years": 12,
  "annual_production_oz": 150000,
  "gold_price_assumption": 1950,
  "copper_price_assumption": 4.25,
  "silver_price_assumption": 24.50,
  "confidence": 0.95
}
```

RULES:
- Extract ONLY explicitly stated values
- Identify the study type correctly (PEA < PFS < DFS in reliability)
- NPV and IRR are typically the headline numbers in executive summaries
- Note the discount rate used - usually 5% or 8%
- Metal prices are key assumptions that affect economics

DOCUMENT TEXT:
{document_text}

Extract the project economics as JSON:"""


# =============================================================================
# DOCUMENT CLASSIFICATION PROMPT
# =============================================================================

DOCUMENT_CLASSIFICATION_PROMPT = """Classify this mining document into one of these categories:

CATEGORIES:
1. **production_report** - Quarterly/monthly production results, operational updates
2. **technical_report** - NI 43-101, feasibility studies, PEA, resource estimates
3. **earnings_report** - Financial results, MD&A, annual reports
4. **news_release** - General press release, exploration updates, drill results
5. **investor_presentation** - Slide deck, investor day materials

ALSO IDENTIFY:
- Company name and ticker (if mentioned)
- Projects/mines mentioned
- Primary commodity focus
- Report date/period

OUTPUT FORMAT (JSON):
```json
{
  "document_type": "production_report",
  "company_name": "Company Name",
  "company_ticker": "TICK",
  "projects_mentioned": ["Mine 1", "Project 2"],
  "primary_commodity": "gold",
  "report_date": "2025-09-15",
  "report_period": "Q3 2025",
  "confidence": 0.95
}
```

DOCUMENT TEXT (first 2000 chars):
{document_text}

Classify this document:"""


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_prompt_for_type(extraction_type: str) -> str:
    """Get the appropriate prompt for an extraction type."""
    prompts = {
        "production": PRODUCTION_EXTRACTION_PROMPT,
        "reserves": RESERVES_EXTRACTION_PROMPT,
        "economics": ECONOMICS_EXTRACTION_PROMPT,
        "classification": DOCUMENT_CLASSIFICATION_PROMPT,
    }
    return prompts.get(extraction_type, PRODUCTION_EXTRACTION_PROMPT)


def format_prompt(prompt_template: str, document_text: str, max_chars: int = 15000) -> str:
    """Format a prompt with document text, truncating if necessary."""
    # Truncate document text if too long
    if len(document_text) > max_chars:
        document_text = document_text[:max_chars] + "\n\n[TRUNCATED - Document continues...]"
    
    # Use simple string replacement to avoid issues with JSON curly braces
    return prompt_template.replace("{document_text}", document_text)
