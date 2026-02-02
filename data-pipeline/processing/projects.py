"""
Project Domain Module for Resource Capital

Database operations for mining project entities.
Extracted from db_manager.py for better code organization.

Usage:
    from processing.projects import (
        get_or_create_project,
        get_projects_by_company,
        get_project_by_id,
    )
"""

from typing import Dict, List, Optional

from .db_manager import get_cursor


def get_or_create_project(
    company_id: int,
    name: str,
    location: str = None,
    latitude: float = None,
    longitude: float = None,
    stage: str = None,
    commodity: str = None,
    ownership_percentage: float = 100.0
) -> int:
    """
    Get existing project or create new one.

    Args:
        company_id: ID of the owning company
        name: Project name
        location: Location description
        latitude: GPS latitude
        longitude: GPS longitude
        stage: Development stage (e.g., "Exploration", "Development", "Production")
        commodity: Primary commodity
        ownership_percentage: Company's ownership stake (default: 100%)

    Returns:
        Project ID
    """
    with get_cursor() as cursor:
        # Try to get existing
        cursor.execute(
            "SELECT id FROM projects WHERE company_id = %s AND name = %s",
            (company_id, name)
        )
        result = cursor.fetchone()

        if result:
            return result['id']

        # Create new
        cursor.execute("""
            INSERT INTO projects
                (company_id, name, location, latitude, longitude, stage, commodity, ownership_percentage)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (company_id, name, location, latitude, longitude, stage, commodity, ownership_percentage))

        return cursor.fetchone()['id']


def get_projects_by_company(company_id: int) -> List[Dict]:
    """
    Get all projects for a company.

    Args:
        company_id: Company database ID

    Returns:
        List of project dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM projects WHERE company_id = %s ORDER BY name",
            (company_id,)
        )
        return cursor.fetchall()


def get_project_by_id(project_id: int) -> Optional[Dict]:
    """
    Get project by ID.

    Args:
        project_id: Project database ID

    Returns:
        Project dictionary or None if not found
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
        return cursor.fetchone()


def get_all_projects() -> List[Dict]:
    """
    Get all projects with company info.

    Returns:
        List of project dictionaries with company details
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT p.*, c.ticker, c.name as company_name
            FROM projects p
            JOIN companies c ON p.company_id = c.id
            ORDER BY c.ticker, p.name
        """)
        return cursor.fetchall()


def get_projects_by_stage(stage: str) -> List[Dict]:
    """
    Get projects by development stage.

    Args:
        stage: Development stage (e.g., "Production", "Development")

    Returns:
        List of project dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM projects WHERE stage ILIKE %s ORDER BY name",
            (stage,)
        )
        return cursor.fetchall()


def get_projects_with_coordinates() -> List[Dict]:
    """
    Get all projects that have GPS coordinates.

    Returns:
        List of project dictionaries with latitude/longitude
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT p.*, c.ticker, c.name as company_name
            FROM projects p
            JOIN companies c ON p.company_id = c.id
            WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
            ORDER BY c.ticker, p.name
        """)
        return cursor.fetchall()


def update_project(
    project_id: int,
    name: str = None,
    location: str = None,
    latitude: float = None,
    longitude: float = None,
    stage: str = None,
    commodity: str = None,
    ownership_percentage: float = None
) -> bool:
    """
    Update project details.

    Args:
        project_id: Project database ID
        name: New project name
        location: New location description
        latitude: New GPS latitude
        longitude: New GPS longitude
        stage: New development stage
        commodity: New primary commodity
        ownership_percentage: New ownership stake

    Returns:
        True if project was found and updated
    """
    with get_cursor() as cursor:
        cursor.execute("""
            UPDATE projects SET
                name = COALESCE(%s, name),
                location = COALESCE(%s, location),
                latitude = COALESCE(%s, latitude),
                longitude = COALESCE(%s, longitude),
                stage = COALESCE(%s, stage),
                commodity = COALESCE(%s, commodity),
                ownership_percentage = COALESCE(%s, ownership_percentage)
            WHERE id = %s
        """, (name, location, latitude, longitude, stage, commodity, ownership_percentage, project_id))

        return cursor.rowcount > 0


def insert_reserves_resources(
    project_id: int,
    report_date: str,
    category: str,
    is_reserve: bool = False,
    deposit_name: str = 'Main',
    tonnes: float = None,
    grade: float = None,
    grade_unit: str = None,
    contained_metal: float = None,
    contained_metal_unit: str = None,
    **kwargs
) -> Optional[int]:
    """
    Insert reserves/resources record for a project.

    Args:
        project_id: Project database ID
        report_date: Date of the resource estimate
        category: Resource category (e.g., "Measured", "Indicated", "Inferred")
        is_reserve: True if this is a reserve (vs resource)
        deposit_name: Name of the deposit
        tonnes: Tonnage
        grade: Grade value
        grade_unit: Grade unit (e.g., "g/t", "%")
        contained_metal: Contained metal amount
        contained_metal_unit: Contained metal unit (e.g., "oz", "lbs")

    Returns:
        Record ID or None on conflict
    """
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO reserves_resources
                (project_id, report_date, category, is_reserve, deposit_name,
                 tonnes, grade, grade_unit, contained_metal, contained_metal_unit)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (project_id, report_date, category, deposit_name) DO UPDATE SET
                tonnes = COALESCE(EXCLUDED.tonnes, reserves_resources.tonnes),
                grade = COALESCE(EXCLUDED.grade, reserves_resources.grade),
                contained_metal = COALESCE(EXCLUDED.contained_metal, reserves_resources.contained_metal)
            RETURNING id
        """, (
            project_id, report_date, category, is_reserve, deposit_name,
            tonnes, grade, grade_unit, contained_metal, contained_metal_unit
        ))

        result = cursor.fetchone()
        return result['id'] if result else None


def insert_mine_production(
    project_id: int,
    period_end: str,
    period_type: str = 'quarterly',
    **production_data
) -> Optional[int]:
    """
    Insert mine production record.

    Args:
        project_id: Project database ID
        period_end: End date of the reporting period
        period_type: Period type (e.g., "quarterly", "annual")
        **production_data: Production metrics (ore_mined_tonnes, gold_produced_oz, etc.)

    Returns:
        Record ID or None on conflict
    """
    valid_columns = [
        'ore_mined_tonnes', 'ore_processed_tonnes', 'throughput_tpd',
        'head_grade', 'head_grade_unit', 'recovery_rate',
        'gold_produced_oz', 'silver_produced_oz', 'copper_produced_lbs',
        'nickel_produced_lbs', 'uranium_produced_lbs',
        'platinum_produced_oz', 'palladium_produced_oz',
        'gold_equivalent_oz', 'copper_equivalent_lbs',
        'aisc_per_oz', 'cash_cost_per_oz', 'aisc_per_lb', 'cash_cost_per_lb',
        'mining_cost_per_tonne', 'processing_cost_per_tonne',
        'source_url', 'source_type', 'source_priority', 'confidence_score'
    ]

    data = {k: v for k, v in production_data.items() if k in valid_columns and v is not None}

    columns = ['project_id', 'period_end', 'period_type'] + list(data.keys())
    values = [project_id, period_end, period_type] + list(data.values())

    placeholders = ', '.join(['%s'] * len(values))
    columns_str = ', '.join(columns)

    update_cols = [f"{c} = EXCLUDED.{c}" for c in data.keys()]
    update_str = ', '.join(update_cols) if update_cols else "project_id = EXCLUDED.project_id"

    with get_cursor() as cursor:
        cursor.execute(f"""
            INSERT INTO mine_production ({columns_str})
            VALUES ({placeholders})
            ON CONFLICT (project_id, period_type, period_end) DO UPDATE SET
                {update_str}
            RETURNING id
        """, values)

        result = cursor.fetchone()
        return result['id'] if result else None


def get_project_reserves(project_id: int) -> List[Dict]:
    """
    Get reserves/resources for a project.

    Args:
        project_id: Project database ID

    Returns:
        List of reserve/resource records
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM reserves_resources
            WHERE project_id = %s
            ORDER BY report_date DESC, is_reserve DESC, category
        """, (project_id,))
        return cursor.fetchall()


def get_project_production(project_id: int, limit: int = 10) -> List[Dict]:
    """
    Get production history for a project.

    Args:
        project_id: Project database ID
        limit: Maximum records to return

    Returns:
        List of production records
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM mine_production
            WHERE project_id = %s
            ORDER BY period_end DESC
            LIMIT %s
        """, (project_id, limit))
        return cursor.fetchall()
