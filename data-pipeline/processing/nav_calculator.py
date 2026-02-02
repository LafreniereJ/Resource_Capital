"""
NAV Calculator for Mining Projects
Computes Net Asset Value using:
1. DCF from technical report economics adjusted for current metal prices
2. Price sensitivity deltas
3. Resource-based in-situ valuations when DCF data unavailable
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime
from typing import Dict, List, Optional

from db_manager import db_connection, get_metal_prices

# Default commodity price sensitivity coefficients
# These represent % change in NPV per 1% change in commodity price
PRICE_SENSITIVITY = {
    'gold': 1.5,      # Gold projects are highly leveraged to gold price
    'silver': 1.3,
    'copper': 1.2,
    'platinum': 1.4,
    'palladium': 1.3,
    'uranium': 1.6,
    'nickel': 1.2,
    'zinc': 1.1,
}

# In-situ value multiples ($/oz or $/lb) for when DCF data unavailable
# Based on typical market valuations for different project stages
IN_SITU_MULTIPLES = {
    'gold': {
        'producing': 150,      # $/oz for producing mines
        'development': 80,     # $/oz for development projects
        'exploration': 30,     # $/oz for resources
    },
    'silver': {
        'producing': 3.0,
        'development': 1.5,
        'exploration': 0.5,
    },
    'copper': {
        'producing': 0.15,     # $/lb
        'development': 0.08,
        'exploration': 0.03,
    },
}


def calculate_project_nav(
    project_id: int,
    metal_prices: Optional[Dict] = None,
    discount_rate: float = 5.0
) -> Dict:
    """
    Calculate NAV for a project using technical report economics.
    
    Methodology:
    1. If project_economics has NPV data, use price-adjusted DCF approach
    2. If only mineral estimates exist, use in-situ valuation
    
    Returns:
        {
            'project_id': int,
            'nav_million': float,
            'method': str,
            'metal_prices_used': dict,
            'base_npv': float (from report),
            'price_adjustment': float,
            'sensitivity': dict,
            'last_calculated': str
        }
    """
    if metal_prices is None:
        metal_prices = _get_current_metal_prices()
    
    # Get project economics from technical reports
    economics = _get_project_economics(project_id)
    
    if economics and economics.get('npv_million'):
        # Method 1: Price-adjusted DCF
        return _calculate_dcf_nav(project_id, economics, metal_prices)
    else:
        # Method 2: In-situ valuation based on resources
        estimates = _get_mineral_estimates(project_id)
        if estimates:
            return _calculate_insitu_nav(project_id, estimates, metal_prices)
        else:
            return {
                'project_id': project_id,
                'nav_million': None,
                'method': 'no_data',
                'message': 'No economics or resource data available',
                'metal_prices_used': metal_prices,
                'last_calculated': datetime.now().isoformat()
            }


def _calculate_dcf_nav(
    project_id: int,
    economics: Dict,
    metal_prices: Dict
) -> Dict:
    """
    Adjust technical report NPV for current metal prices.
    
    Uses linear price sensitivity:
    adjusted_npv = base_npv * (1 + sensitivity * price_change_pct)
    """
    base_npv = economics.get('npv_million', 0)
    assumed_price = economics.get('gold_price_assumption', 0)
    
    # Determine primary commodity (default to gold)
    commodity = _determine_primary_commodity(economics)
    
    current_price = metal_prices.get(commodity, {}).get('price', assumed_price)
    
    if assumed_price and assumed_price > 0:
        price_change_pct = (current_price - assumed_price) / assumed_price
        sensitivity = PRICE_SENSITIVITY.get(commodity, 1.2)
        adjustment = 1 + (sensitivity * price_change_pct)
        adjusted_npv = base_npv * adjustment
    else:
        adjusted_npv = base_npv
        adjustment = 1.0
    
    # Calculate sensitivity scenarios
    sensitivity_data = _calculate_sensitivity_scenarios(
        base_npv, assumed_price, commodity, metal_prices
    )
    
    return {
        'project_id': project_id,
        'nav_million': round(adjusted_npv, 2),
        'method': 'dcf_adjusted',
        'base_npv_million': base_npv,
        'assumed_price': assumed_price,
        'current_price': current_price,
        'price_adjustment_factor': round(adjustment, 3),
        'irr_percent': economics.get('irr_percent'),
        'payback_years': economics.get('payback_years'),
        'aisc_per_oz': economics.get('aisc_per_oz'),
        'initial_capex_million': economics.get('initial_capex_million'),
        'study_type': economics.get('study_type'),
        'mine_life_years': economics.get('mine_life_years'),
        'metal_prices_used': metal_prices,
        'sensitivity': sensitivity_data,
        'last_calculated': datetime.now().isoformat()
    }


def _calculate_insitu_nav(
    project_id: int,
    estimates: List[Dict],
    metal_prices: Dict
) -> Dict:
    """
    Calculate NAV using in-situ resource valuation.
    
    in_situ_value = contained_metal * multiple_per_unit
    """
    total_nav = 0
    breakdown = []
    
    for est in estimates:
        commodity = est.get('commodity', 'gold').lower()
        contained = est.get('contained_metal', 0) or 0
        category = est.get('category', 'indicated').lower()
        
        # Determine stage multiplier (higher for M&I vs inferred)
        if 'proven' in category or 'measured' in category:
            stage = 'producing'  # Use higher multiple for high-confidence resources
        elif 'indicated' in category or 'probable' in category:
            stage = 'development'
        else:
            stage = 'exploration'
        
        multiples = IN_SITU_MULTIPLES.get(commodity, IN_SITU_MULTIPLES['gold'])
        multiple = multiples.get(stage, multiples['exploration'])
        
        # Calculate value (assumes contained_metal is in Moz or Mlbs)
        value = contained * multiple
        total_nav += value
        
        breakdown.append({
            'category': est.get('category'),
            'commodity': commodity,
            'contained_metal': contained,
            'unit': est.get('contained_unit', 'Moz'),
            'multiple_used': multiple,
            'value_million': round(value, 2)
        })
    
    return {
        'project_id': project_id,
        'nav_million': round(total_nav, 2),
        'method': 'in_situ',
        'breakdown': breakdown,
        'metal_prices_used': metal_prices,
        'last_calculated': datetime.now().isoformat()
    }


def _calculate_sensitivity_scenarios(
    base_npv: float,
    assumed_price: float,
    commodity: str,
    metal_prices: Dict
) -> Dict:
    """
    Calculate NAV at different price scenarios (-20%, -10%, 0%, +10%, +20%)
    """
    if not assumed_price or assumed_price <= 0:
        return {}
    
    sensitivity = PRICE_SENSITIVITY.get(commodity, 1.2)
    scenarios = {}
    
    for pct_change in [-0.20, -0.10, 0, 0.10, 0.20]:
        scenario_price = assumed_price * (1 + pct_change)
        adjustment = 1 + (sensitivity * pct_change)
        scenario_npv = base_npv * adjustment
        
        label = f"{int(pct_change * 100):+d}%"
        scenarios[label] = {
            'price': round(scenario_price, 2),
            'nav_million': round(scenario_npv, 2)
        }
    
    return scenarios


def calculate_company_nav(ticker: str) -> Dict:
    """
    Calculate aggregate NAV for all projects of a company.
    """
    with db_connection() as conn:
        cursor = conn.cursor()
        
        # Get company
        cursor.execute("SELECT id, market_cap FROM companies WHERE ticker = ?", (ticker.upper(),))
        company = cursor.fetchone()
        if not company:
            return {'error': f'Company {ticker} not found'}
        
        company_id = company['id']
        market_cap = company['market_cap']
        
        # Get all projects
        cursor.execute("SELECT id, name, stage, commodity FROM projects WHERE company_id = ?", (company_id,))
        projects = cursor.fetchall()
    
    metal_prices = _get_current_metal_prices()
    
    total_nav = 0
    project_navs = []
    
    for proj in projects:
        nav_result = calculate_project_nav(proj['id'], metal_prices)
        project_nav = nav_result.get('nav_million') or 0
        total_nav += project_nav
        
        project_navs.append({
            'project_id': proj['id'],
            'name': proj['name'],
            'stage': proj['stage'],
            'commodity': proj['commodity'],
            'nav_million': project_nav,
            'method': nav_result.get('method')
        })
    
    # Calculate NAV premium/discount to market cap
    nav_premium = None
    if market_cap and market_cap > 0:
        nav_premium = ((total_nav * 1e6) - market_cap) / market_cap * 100
    
    return {
        'ticker': ticker,
        'company_id': company_id,
        'total_nav_million': round(total_nav, 2),
        'market_cap_million': round(market_cap / 1e6, 2) if market_cap else None,
        'nav_premium_pct': round(nav_premium, 1) if nav_premium else None,
        'project_count': len(projects),
        'projects': project_navs,
        'metal_prices_used': metal_prices,
        'last_calculated': datetime.now().isoformat()
    }


def calculate_sensitivity(
    project_id: int,
    commodity: str = 'gold',
    min_price: float = None,
    max_price: float = None,
    steps: int = 10
) -> Dict:
    """
    Calculate NAV sensitivity to commodity price changes.
    
    Returns NAV values at different price points for charting.
    """
    economics = _get_project_economics(project_id)
    
    if not economics or not economics.get('npv_million'):
        return {
            'project_id': project_id,
            'error': 'No economics data available for sensitivity analysis'
        }
    
    base_npv = economics.get('npv_million', 0)
    assumed_price = economics.get('gold_price_assumption', 0)
    
    if not assumed_price or assumed_price <= 0:
        return {
            'project_id': project_id,
            'error': 'No price assumption in economics data'
        }
    
    # Default price range: ±40% of assumed price
    if min_price is None:
        min_price = assumed_price * 0.6
    if max_price is None:
        max_price = assumed_price * 1.4
    
    sensitivity = PRICE_SENSITIVITY.get(commodity.lower(), 1.2)
    
    # Generate price/NAV pairs
    data_points = []
    price_step = (max_price - min_price) / steps
    
    for i in range(steps + 1):
        price = min_price + (i * price_step)
        price_change_pct = (price - assumed_price) / assumed_price
        adjustment = 1 + (sensitivity * price_change_pct)
        nav = base_npv * adjustment
        
        data_points.append({
            'price': round(price, 2),
            'nav_million': round(nav, 2)
        })
    
    # Find breakeven (where NAV = 0)
    breakeven_price = None
    if base_npv > 0:
        # NAV = 0 when adjustment = 0, i.e., price_change = -1/sensitivity
        breakeven_change = -1 / sensitivity
        breakeven_price = assumed_price * (1 + breakeven_change)
    
    return {
        'project_id': project_id,
        'commodity': commodity,
        'base_npv_million': base_npv,
        'assumed_price': assumed_price,
        'sensitivity_factor': sensitivity,
        'breakeven_price': round(breakeven_price, 2) if breakeven_price else None,
        'data_points': data_points,
        'last_calculated': datetime.now().isoformat()
    }


def compare_projects(project_ids: List[int]) -> Dict:
    """
    Compare multiple projects side-by-side.
    Returns normalized metrics for comparison.
    """
    metal_prices = _get_current_metal_prices()
    projects = []
    
    for pid in project_ids:
        # Get project info
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.*, c.ticker, c.name as company_name
                FROM projects p
                JOIN companies c ON p.company_id = c.id
                WHERE p.id = ?
            """, (pid,))
            proj = cursor.fetchone()
        
        if not proj:
            continue
        
        # Get economics
        economics = _get_project_economics(pid)
        
        # Calculate NAV
        nav_result = calculate_project_nav(pid, metal_prices)
        
        projects.append({
            'project_id': pid,
            'name': proj['name'],
            'company': proj['company_name'],
            'ticker': proj['ticker'],
            'location': proj['location'],
            'stage': proj['stage'],
            'commodity': proj['commodity'],
            # Economics
            'npv_million': economics.get('npv_million') if economics else None,
            'irr_percent': economics.get('irr_percent') if economics else None,
            'payback_years': economics.get('payback_years') if economics else None,
            'aisc_per_oz': economics.get('aisc_per_oz') if economics else None,
            'initial_capex_million': economics.get('initial_capex_million') if economics else None,
            'mine_life_years': economics.get('mine_life_years') if economics else None,
            'study_type': economics.get('study_type') if economics else None,
            # NAV
            'nav_million': nav_result.get('nav_million'),
            'nav_method': nav_result.get('method'),
        })
    
    return {
        'projects': projects,
        'metal_prices_used': metal_prices,
        'compared_at': datetime.now().isoformat()
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _get_current_metal_prices() -> Dict:
    """Fetch current metal prices from database."""
    try:
        prices = get_metal_prices()
        return {
            row['commodity'].lower(): {
                'price': row['price'],
                'currency': row['currency'],
                'updated_at': row.get('updated_at')
            }
            for row in prices
        }
    except Exception:
        # Fallback to default prices if DB unavailable
        return {
            'gold': {'price': 2000, 'currency': 'USD'},
            'silver': {'price': 25, 'currency': 'USD'},
            'copper': {'price': 4.0, 'currency': 'USD'},
        }


def _get_project_economics(project_id: int) -> Optional[Dict]:
    """Get economics data for a project."""
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            # First get the project to find its name
            cursor.execute("SELECT name, company_id FROM projects WHERE id = ?", (project_id,))
            proj = cursor.fetchone()
            if not proj:
                return None
            
            # Get economics by project name or company
            cursor.execute("""
                SELECT * FROM project_economics 
                WHERE project_name = ? OR company_id = ?
                ORDER BY id DESC LIMIT 1
            """, (proj['name'], proj['company_id']))
            row = cursor.fetchone()
            return dict(row) if row else None
    except Exception:
        return None


def _get_mineral_estimates(project_id: int) -> List[Dict]:
    """Get mineral estimates for a project."""
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, company_id FROM projects WHERE id = ?", (project_id,))
            proj = cursor.fetchone()
            if not proj:
                return []
            
            cursor.execute("""
                SELECT * FROM mineral_estimates 
                WHERE project_name = ? OR company_id = ?
            """, (proj['name'], proj['company_id']))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    except Exception:
        return []


def _determine_primary_commodity(economics: Dict) -> str:
    """Determine primary commodity from economics data."""
    if economics.get('gold_price_assumption'):
        return 'gold'
    # Could add more logic here for other commodities
    return 'gold'


# ============================================================================
# CACHE OPERATIONS
# ============================================================================

def cache_project_nav(project_id: int, nav_data: Dict) -> int:
    """Cache computed NAV for a project."""
    with db_connection() as conn:
        cursor = conn.cursor()
        
        gold_price = nav_data.get('metal_prices_used', {}).get('gold', {}).get('price')
        copper_price = nav_data.get('metal_prices_used', {}).get('copper', {}).get('price')
        silver_price = nav_data.get('metal_prices_used', {}).get('silver', {}).get('price')
        
        cursor.execute("""
            INSERT INTO project_nav_cache (
                project_id, company_id, nav_million, 
                gold_price_used, copper_price_used, silver_price_used,
                calculation_method
            ) VALUES (?, 
                (SELECT company_id FROM projects WHERE id = ?),
                ?, ?, ?, ?, ?
            )
            ON CONFLICT(project_id) DO UPDATE SET
                nav_million = excluded.nav_million,
                gold_price_used = excluded.gold_price_used,
                copper_price_used = excluded.copper_price_used,
                silver_price_used = excluded.silver_price_used,
                calculation_method = excluded.calculation_method,
                last_calculated = CURRENT_TIMESTAMP
        """, (
            project_id, project_id,
            nav_data.get('nav_million'),
            gold_price, copper_price, silver_price,
            nav_data.get('method')
        ))
        conn.commit()
        return cursor.lastrowid


def get_cached_nav(project_id: int) -> Optional[Dict]:
    """Get cached NAV for a project."""
    with db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM project_nav_cache WHERE project_id = ?
        """, (project_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


if __name__ == "__main__":
    # Test with a sample project
    print("Testing NAV Calculator...")
    
    # Test company NAV
    result = calculate_company_nav("AEM")
    print(f"\nCompany NAV for AEM:")
    print(f"  Total NAV: ${result.get('total_nav_million', 0):.1f}M")
    print(f"  Market Cap: ${result.get('market_cap_million', 0):.1f}M")
    print(f"  NAV Premium: {result.get('nav_premium_pct', 'N/A')}%")
    print(f"  Projects: {result.get('project_count', 0)}")
