"""
Shared data models for Resource Capital Pipeline.
Consolidates dataclasses used across multiple modules.
"""

from dataclasses import asdict, dataclass
from typing import Optional


@dataclass
class ProductionData:
    """Extracted production metrics from an earnings/production report."""
    mine_name: Optional[str] = None
    period: Optional[str] = None  # Q1 2024, Q2 2024, etc.
    period_end: Optional[str] = None  # YYYY-MM-DD

    # Production volumes
    ore_mined_tonnes: Optional[float] = None
    ore_processed_tonnes: Optional[float] = None
    head_grade: Optional[float] = None
    head_grade_unit: Optional[str] = None
    recovery_rate: Optional[float] = None

    # Metal production
    gold_oz: Optional[float] = None
    silver_oz: Optional[float] = None
    copper_lbs: Optional[float] = None
    zinc_lbs: Optional[float] = None
    gold_equivalent_oz: Optional[float] = None

    # Costs
    aisc_per_oz: Optional[float] = None
    cash_cost_per_oz: Optional[float] = None

    # Metadata
    source_url: Optional[str] = None
    confidence: Optional[float] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class ResourceEstimate:
    """Mineral resource or reserve estimate from technical report."""
    category: str  # Measured, Indicated, Inferred, Proven, Probable
    is_reserve: bool = False
    tonnes_mt: Optional[float] = None
    grade: Optional[float] = None
    grade_unit: Optional[str] = None  # g/t, %, oz/t
    contained_metal: Optional[float] = None
    contained_metal_unit: Optional[str] = None  # Moz, Mlbs, kt
    cutoff_grade: Optional[float] = None
    deposit_name: Optional[str] = None
    commodity: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class EconomicParameters:
    """Economic parameters from a technical/feasibility study."""
    npv: Optional[float] = None  # Net Present Value in millions
    npv_discount_rate: Optional[float] = None  # e.g., 5, 8
    irr: Optional[float] = None  # Internal Rate of Return %
    payback_years: Optional[float] = None
    capex_initial: Optional[float] = None  # Initial CAPEX in millions
    capex_sustaining: Optional[float] = None  # Sustaining CAPEX in millions
    opex_per_tonne: Optional[float] = None
    aisc_per_oz: Optional[float] = None
    gold_price_assumption: Optional[float] = None  # USD/oz
    mine_life_years: Optional[float] = None
    annual_production: Optional[float] = None
    production_unit: Optional[str] = None  # oz, lbs, tonnes

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return asdict(self)
