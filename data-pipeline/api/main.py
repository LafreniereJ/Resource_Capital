"""
Resource Capital API - FastAPI Backend
Serves mining company data, metrics, and filings to the frontend.
"""

import os
import sys
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add processing and ingestion dirs to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ingestion'))

from db_manager import (  # Extraction and earnings; Market data queries; Metal prices; Database connection
    get_all_companies, get_balance_sheet, get_cash_flow, get_company,
    get_company_tickers, get_cursor, get_earnings, get_earnings_history,
    get_extraction_queue_jobs, get_extraction_queue_stats, get_financials,
    get_income_statement, get_latest_metrics, get_metal_price,
    get_metal_price_history, get_metal_prices, get_metrics,
    get_mineral_estimates, get_news, get_news_for_feed, get_news_stats,
    get_pending_extraction_jobs, get_price_history, get_price_movers,
    get_project_economics, get_projects, get_sector_breakdown, get_stats,
    get_technical_reports, get_unprocessed_filings, screen_companies,
    search_companies)
from news_client import fetch_mining_news
# Import document routes
from routes.documents import router as documents_router

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class CompanyBase(BaseModel):
    id: int
    name: str
    ticker: str
    exchange: Optional[str] = "TSX"
    website: Optional[str] = None
    commodity: Optional[str] = None
    currency: Optional[str] = "CAD"
    current_price: Optional[float] = None
    market_cap: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    avg_volume: Optional[int] = None
    last_updated: Optional[str] = None


class ProjectBase(BaseModel):
    id: int
    company_id: int
    name: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    stage: Optional[str] = None
    commodity: Optional[str] = None


class MetricBase(BaseModel):
    id: int
    filing_id: Optional[int] = None
    project_id: Optional[int] = None
    metric_name: str
    metric_value: Optional[float] = None
    unit: Optional[str] = None
    confidence_score: Optional[float] = None
    raw_text_snippet: Optional[str] = None
    hole_id: Optional[str] = None
    interval_length: Optional[float] = None
    created_at: Optional[str] = None


class FilingBase(BaseModel):
    id: int
    company_id: int
    filing_type: Optional[str] = None
    filing_date: Optional[str] = None
    sedar_url: Optional[str] = None
    local_path: Optional[str] = None
    is_processed: Optional[int] = 0


class StatsResponse(BaseModel):
    companies: int
    projects: int
    filings: int
    metrics: int


class MarketMover(BaseModel):
    ticker: str
    name: str
    current_price: Optional[float] = None
    market_cap: Optional[float] = None
    change_percent: Optional[float] = None  # Future: calculate from historical


# =============================================================================
# APP SETUP
# =============================================================================

app = FastAPI(
    title="Resource Capital API",
    description="Mining intelligence platform API",
    version="1.0.0"
)

# CORS - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents_router)


# =============================================================================
# HEALTH / STATUS
# =============================================================================

@app.get("/")
def root():
    return {"status": "ok", "service": "Resource Capital API", "version": "1.0.0"}


@app.get("/api/health")
def health():
    """Basic health check."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/health/detailed")
def health_detailed():
    """
    Detailed health check including database connectivity and service status.

    Returns status of:
    - Database connection pool
    - Recent data freshness
    - Circuit breaker states (if available)
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }

    # Check database connectivity
    try:
        with get_cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status["checks"]["database"] = {"status": "healthy"}
    except Exception as e:
        health_status["checks"]["database"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"

    # Check data freshness (metal prices should update every 15 min)
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    MAX(fetched_at) as last_update
                FROM metal_prices
            """)
            result = cursor.fetchone()
            if result:
                last_update = result.get('last_update')
                health_status["checks"]["metal_prices"] = {
                    "status": "healthy",
                    "count": result.get('total', 0),
                    "last_update": str(last_update) if last_update else None
                }
    except Exception as e:
        health_status["checks"]["metal_prices"] = {"status": "unknown", "error": str(e)}

    # Check company data freshness
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    MAX(last_updated) as last_update
                FROM companies
            """)
            result = cursor.fetchone()
            if result:
                health_status["checks"]["companies"] = {
                    "status": "healthy",
                    "count": result.get('total', 0),
                    "last_update": str(result.get('last_update')) if result.get('last_update') else None
                }
    except Exception as e:
        health_status["checks"]["companies"] = {"status": "unknown", "error": str(e)}

    # Check news data
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) as total FROM news
                WHERE published_at > NOW() - INTERVAL '24 hours'
            """)
            result = cursor.fetchone()
            if result:
                health_status["checks"]["news_24h"] = {
                    "status": "healthy",
                    "count": result.get('total', 0)
                }
    except Exception as e:
        health_status["checks"]["news_24h"] = {"status": "unknown", "error": str(e)}

    return health_status


@app.get("/api/stats", response_model=StatsResponse)
def get_database_stats():
    """Get database statistics."""
    return get_stats()


# =============================================================================
# COMPANIES
# =============================================================================

@app.get("/api/companies", response_model=List[CompanyBase])
def list_companies(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("market_cap", enum=["market_cap", "ticker", "name", "current_price"])
):
    """Get all companies, sorted by market cap by default."""
    companies = get_all_companies()

    # Apply sorting
    if sort_by == "ticker":
        companies.sort(key=lambda x: x.get('ticker', ''))
    elif sort_by == "name":
        companies.sort(key=lambda x: x.get('name', ''))
    elif sort_by == "current_price":
        companies.sort(key=lambda x: x.get('current_price') or 0, reverse=True)
    # market_cap is default from DB query

    return companies[offset:offset + limit]


@app.get("/api/companies/{ticker}", response_model=CompanyBase)
def get_company_by_ticker(ticker: str):
    """Get a single company by ticker."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")
    return company


@app.get("/api/companies/{ticker}/projects", response_model=List[ProjectBase])
def get_company_projects(ticker: str):
    """Get all projects for a company."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")
    return get_projects(company['id'])


@app.get("/api/companies/{ticker}/metrics")
def get_company_metrics(ticker: str):
    """Get extracted metrics for a company (via projects)."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    projects = get_projects(company['id'])
    all_metrics = []
    for project in projects:
        metrics = get_metrics(project['id'])
        for m in metrics:
            m['project_name'] = project['name']
        all_metrics.extend(metrics)

    return all_metrics


# =============================================================================
# MARKET DATA (for dashboard widgets)
# =============================================================================

@app.get("/api/market/leaderboard")
def get_market_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """Get top companies by market cap for leaderboard display."""
    companies = get_all_companies()
    with_price = [c for c in companies if c.get('current_price')]
    return with_price[:limit]


@app.get("/api/market/gainers")
def get_gainers(limit: int = Query(5, ge=1, le=20)):
    """Get top gainers based on daily price change."""
    return get_price_movers('gainers', limit)


@app.get("/api/market/losers")
def get_losers(limit: int = Query(5, ge=1, le=20)):
    """Get top losers based on daily price change."""
    return get_price_movers('losers', limit)


@app.get("/api/market/sectors")
def get_sectors():
    """Get market breakdown by commodity/sector."""
    return get_sector_breakdown()


@app.get("/api/market/search")
def search_companies_endpoint(q: str = Query(..., min_length=1)):
    """Search companies by ticker or name."""
    return search_companies(q)


@app.get("/api/market/screener")
def screen_companies_endpoint(
    min_market_cap: Optional[float] = None,
    max_market_cap: Optional[float] = None,
    commodity: Optional[str] = None,
    exchange: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """Screen companies by various criteria."""
    return screen_companies(
        min_market_cap=min_market_cap,
        max_market_cap=max_market_cap,
        commodity=commodity,
        exchange=exchange,
        min_price=min_price,
        max_price=max_price,
        limit=limit
    )


# =============================================================================
# METAL PRICES
# =============================================================================

@app.get("/api/metals")
def get_metals():
    """
    Get current prices for all tracked metals/commodities.
    Returns: gold, silver, copper, platinum, palladium, uranium prices.
    """
    prices = get_metal_prices()
    if not prices:
        return {
            "message": "No metal prices available. Run fetch_metal_prices.py to populate.",
            "prices": []
        }
    return {"prices": prices, "count": len(prices)}


@app.get("/api/metals/{commodity}")
def get_metal_detail(
    commodity: str,
    days: int = Query(30, ge=1, le=365, description="Days of history to include")
):
    """
    Get current price and history for a specific metal.
    Valid commodities: gold, silver, copper, platinum, palladium, uranium
    """
    current = get_metal_price(commodity.lower())
    if not current:
        raise HTTPException(
            status_code=404,
            detail=f"Metal '{commodity}' not found. Valid options: gold, silver, copper, platinum, palladium, uranium"
        )

    history = get_metal_price_history(commodity.lower(), days)

    return {
        "current": current,
        "history": history,
        "history_days": days
    }


@app.get("/api/metals/history/all")
def get_all_metals_history(
    days: int = Query(30, ge=1, le=365, description="Days of history")
):
    """
    Get historical prices for all metals (for charting).
    Returns data grouped by commodity.
    """
    history = get_metal_price_history(commodity=None, days=days)

    # Group by commodity
    grouped = {}
    for entry in history:
        commodity = entry['commodity']
        if commodity not in grouped:
            grouped[commodity] = []
        grouped[commodity].append({
            'price': entry['price'],
            'currency': entry['currency'],
            'fetched_at': entry['fetched_at']
        })

    return {
        "history": grouped,
        "days": days,
        "commodities": list(grouped.keys())
    }


# =============================================================================
# METRICS
# =============================================================================

@app.get("/api/metrics/latest")
def get_recent_metrics(limit: int = Query(50, ge=1, le=200)):
    """Get most recently extracted metrics across all companies."""
    return get_latest_metrics(limit)


@app.get("/api/metrics/project/{project_id}")
def get_project_metrics(project_id: int):
    """Get all metrics for a specific project."""
    return get_metrics(project_id)


# =============================================================================
# FILINGS
# =============================================================================

@app.get("/api/filings/pending")
def get_pending_filings():
    """Get filings that haven't been processed yet."""
    return get_unprocessed_filings()


# =============================================================================
# INTELLIGENCE FEED (for sidebar)
# =============================================================================

@app.get("/api/feed")
def get_intelligence_feed(limit: int = Query(20, ge=1, le=100)):
    """
    Get recent activity for the intelligence feed.
    Combines recent metrics and filings.
    """
    feed_items = []

    # Get recent metrics
    metrics = get_latest_metrics(limit)
    for m in metrics:
        feed_items.append({
            "type": "metric",
            "ticker": m.get('ticker'),
            "company_name": m.get('company_name'),
            "title": f"{m.get('metric_name')}: {m.get('metric_value')}",
            "timestamp": m.get('created_at'),
            "details": m.get('raw_text_snippet')
        })

    # Sort by timestamp
    feed_items.sort(key=lambda x: x.get('timestamp') or '', reverse=True)

    return feed_items[:limit]


# =============================================================================
# NEWS (served from database, updated every 15 min by cron)
# =============================================================================

@app.get("/api/news")
def get_news_articles(
    ticker: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100)
):
    """
    Get news from database (updated every 15 minutes by cron).
    - ticker: Filter by company ticker
    - source: Filter by news source
    """
    return get_news(limit=limit, ticker=ticker.upper() if ticker else None, source=source)


@app.get("/api/news/feed")
def get_dashboard_news_feed(limit: int = Query(20, ge=1, le=50)):
    """
    Get news feed for dashboard display.
    Joins with company data for context.
    """
    articles = get_news_for_feed(limit)

    # Format for display
    feed_items = []
    for article in articles:
        pub_date = article.get('published_at', '')
        time_ago = _format_time_ago(pub_date)

        feed_items.append({
            "type": "news",
            "title": article.get('title', '')[:120],
            "description": article.get('description', '')[:200],
            "source": article.get('source', 'Unknown'),
            "url": article.get('url', ''),
            "ticker": article.get('ticker'),
            "company_name": article.get('company_name'),
            "time_ago": time_ago,
            "published_at": pub_date,
            "is_press_release": article.get('is_press_release', 0) == 1
        })

    return feed_items


@app.get("/api/news/press-releases")
def get_press_releases_from_db(limit: int = Query(30, ge=1, le=100)):
    """
    Get press releases from database.
    Filtered to official press releases only.
    """
    return get_news(limit=limit, press_releases_only=True)


@app.get("/api/news/tmx")
def get_tmx_news(limit: int = Query(30, ge=1, le=100)):
    """
    Get official TSX/TSXV press releases from TMX Newsfile.
    """
    return get_news(limit=limit, source="TMX Newsfile Mining")


@app.get("/api/news/stats")
def get_news_statistics():
    """Get news database statistics."""
    return get_news_stats()


@app.get("/api/news/live")
def get_live_news(limit: int = Query(20, ge=1, le=50)):
    """
    Fetch live news (bypasses database cache).
    Use sparingly - prefer /api/news for cached results.
    """
    articles = fetch_mining_news(limit)
    return articles


@app.get("/api/news/article/{article_id}")
def get_article_by_id(article_id: int):
    """
    Get a single news article by ID for the article viewer.
    Returns full article details including content for on-site reading.
    """
    with get_cursor() as cursor:
        cursor.execute('''
            SELECT n.*, c.name as company_name
            FROM news n
            LEFT JOIN companies c ON n.ticker = c.ticker
            WHERE n.id = %s
        ''', (article_id,))

        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Article not found")

    article = dict(row)
    article['time_ago'] = _format_time_ago(article.get('published_at', ''))

    return article


@app.get("/api/news/article/{article_id}/content")
def get_article_content(article_id: int):
    """
    Fetch and return the full article content for on-site reading.
    Scrapes the article URL and extracts readable content.
    """
    import requests
    from bs4 import BeautifulSoup

    with get_cursor() as cursor:
        cursor.execute('SELECT url, title, source, description, published_at, ticker FROM news WHERE id = %s', (article_id,))
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Article not found")

    article = dict(row)
    url = article.get('url', '')

    if not url:
        return {
            "title": article.get('title', ''),
            "source": article.get('source', ''),
            "published_at": article.get('published_at', ''),
            "time_ago": _format_time_ago(article.get('published_at', '')),
            "ticker": article.get('ticker'),
            "content": article.get('description', ''),
            "content_type": "summary",
            "original_url": url
        }

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove script, style, nav, footer elements
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
            tag.decompose()

        # Try to find article content (common selectors)
        content = None
        for selector in ['article', '.article-content', '.post-content', '.entry-content',
                         '.article-body', '.story-body', 'main', '.content']:
            elem = soup.select_one(selector)
            if elem:
                content = elem
                break

        if not content:
            content = soup.body if soup.body else soup

        # Extract paragraphs
        paragraphs = content.find_all(['p', 'h2', 'h3', 'blockquote', 'ul', 'ol'])
        text_content = '\n\n'.join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))

        # Get article image if present
        image_url = None
        og_image = soup.find('meta', property='og:image')
        if og_image:
            image_url = og_image.get('content')

        return {
            "title": article.get('title', ''),
            "source": article.get('source', ''),
            "published_at": article.get('published_at', ''),
            "time_ago": _format_time_ago(article.get('published_at', '')),
            "ticker": article.get('ticker'),
            "content": text_content[:15000],  # Limit content length
            "content_type": "full",
            "image_url": image_url,
            "original_url": url
        }

    except requests.RequestException as e:
        # Fallback to description if fetch fails
        return {
            "title": article.get('title', ''),
            "source": article.get('source', ''),
            "published_at": article.get('published_at', ''),
            "time_ago": _format_time_ago(article.get('published_at', '')),
            "ticker": article.get('ticker'),
            "content": article.get('description', ''),
            "content_type": "summary",
            "original_url": url,
            "error": f"Could not fetch full article: {str(e)}"
        }


def _format_time_ago(date_str: str) -> str:
    """Convert datetime string to relative time."""
    if not date_str:
        return "Recently"
    try:
        # Parse the date string, handling various formats
        date_str_clean = date_str.replace("Z", "").replace("+00:00", "").split("+")[0].split(".")[0]
        dt = datetime.fromisoformat(date_str_clean)
        now = datetime.now()
        diff = now - dt

        # Handle future dates (timezone issues) - show as "Just now"
        total_seconds = diff.total_seconds()
        if total_seconds < 0:
            return "Just now"

        minutes = int(total_seconds // 60)
        hours = int(total_seconds // 3600)
        days = diff.days

        if days > 0:
            return f"{days}d ago"
        elif hours > 0:
            return f"{hours}h ago"
        elif minutes > 0:
            return f"{minutes}m ago"
        else:
            return "Just now"
    except (ValueError, TypeError):
        return "Recently"


# =============================================================================
# FINANCIALS
# =============================================================================

@app.get("/api/companies/{ticker}/financials")
def get_company_financials(
    ticker: str,
    statement_type: Optional[str] = Query(None, enum=["income", "balance", "cashflow"]),
    period_type: Optional[str] = Query("annual", enum=["annual", "quarterly"])
):
    """
    Get financial statements for a company.
    - statement_type: income, balance, cashflow (or all if not specified)
    - period_type: annual or quarterly
    """
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    return get_financials(company['id'], statement_type, period_type)


@app.get("/api/companies/{ticker}/income-statement")
def get_company_income(
    ticker: str,
    period_type: str = Query("annual", enum=["annual", "quarterly"])
):
    """Get income statement for a company."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    return get_income_statement(company['id'], period_type)


@app.get("/api/companies/{ticker}/balance-sheet")
def get_company_balance(
    ticker: str,
    period_type: str = Query("annual", enum=["annual", "quarterly"])
):
    """Get balance sheet for a company."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    return get_balance_sheet(company['id'], period_type)


@app.get("/api/companies/{ticker}/cash-flow")
def get_company_cashflow(
    ticker: str,
    period_type: str = Query("annual", enum=["annual", "quarterly"])
):
    """Get cash flow statement for a company."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    return get_cash_flow(company['id'], period_type)


@app.get("/api/companies/{ticker}/price-history")
def get_company_prices(
    ticker: str,
    days: int = Query(365, ge=1, le=3650)
):
    """Get historical price data for a company."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    return get_price_history(company['id'], days)


# =============================================================================
# EARNINGS & PRODUCTION DATA
# =============================================================================

@app.get("/api/earnings")
def get_earnings_data(
    ticker: Optional[str] = None,
    period: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """
    Get earnings/production data.
    - ticker: Filter by company ticker
    - period: Filter by period (e.g., "Q3 2024")
    """
    return get_earnings(
        ticker=ticker.upper() if ticker else None,
        period=period,
        limit=limit
    )


@app.get("/api/earnings/{ticker}")
def get_ticker_earnings(ticker: str, limit: int = Query(20, ge=1, le=100)):
    """Get earnings history for a specific company."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    return get_earnings_history(ticker.upper(), limit)


@app.get("/api/companies/{ticker}/production")
def get_company_production(ticker: str, limit: int = Query(10, ge=1, le=50)):
    """
    Get production data for a company.
    Alias for earnings endpoint with company context.
    """
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    earnings = get_earnings_history(ticker.upper(), limit)

    # Add company context
    return {
        "company": {
            "ticker": company.get("ticker"),
            "name": company.get("name"),
            "commodity": company.get("commodity")
        },
        "production_records": earnings
    }


# =============================================================================
# TECHNICAL REPORTS & MINERAL ESTIMATES
# =============================================================================

@app.get("/api/technical-reports")
def get_tech_reports(
    ticker: Optional[str] = None,
    report_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """
    Get technical reports (NI 43-101, feasibility studies, etc.).
    - ticker: Filter by company ticker
    - report_type: Filter by type (PEA, PFS, FS, Resource Update)
    """
    return get_technical_reports(
        ticker=ticker.upper() if ticker else None,
        report_type=report_type,
        limit=limit
    )


@app.get("/api/technical-reports/{report_id}")
def get_tech_report_detail(report_id: int):
    """Get a single technical report with its estimates and economics."""
    reports = get_technical_reports(report_id=report_id)
    if not reports:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")

    report = reports[0]

    # Get associated mineral estimates
    estimates = get_mineral_estimates(report_id=report_id)

    # Get associated economics
    economics = get_project_economics(report_id=report_id)

    return {
        "report": report,
        "mineral_estimates": estimates,
        "project_economics": economics
    }


@app.get("/api/technical-reports/{report_id}/estimates")
def get_report_estimates(report_id: int):
    """Get mineral estimates for a specific technical report."""
    estimates = get_mineral_estimates(report_id=report_id)
    if not estimates:
        raise HTTPException(status_code=404, detail=f"No estimates found for report {report_id}")
    return estimates


@app.get("/api/companies/{ticker}/technical-reports")
def get_company_tech_reports(ticker: str, limit: int = Query(10, ge=1, le=50)):
    """Get technical reports for a specific company."""
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    reports = get_technical_reports(ticker=ticker.upper(), limit=limit)

    return {
        "company": {
            "ticker": company.get("ticker"),
            "name": company.get("name")
        },
        "reports": reports
    }


@app.get("/api/companies/{ticker}/resources")
def get_company_resources(ticker: str):
    """
    Get mineral resource/reserve summary for a company.
    Aggregates from all technical reports.
    """
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    # Get all estimates for this company
    estimates = get_mineral_estimates(company_id=company['id'])

    # Group by commodity and category
    summary = {}
    for est in estimates:
        commodity = est.get('commodity', 'Unknown')
        category = est.get('category', 'Unknown')

        if commodity not in summary:
            summary[commodity] = {}

        if category not in summary[commodity]:
            summary[commodity][category] = {
                'tonnage_mt': 0,
                'contained_metal': 0,
                'records': []
            }

        summary[commodity][category]['tonnage_mt'] += est.get('tonnage_mt') or 0
        summary[commodity][category]['contained_metal'] += est.get('contained_metal') or 0
        summary[commodity][category]['records'].append(est)

    return {
        "company": {
            "ticker": company.get("ticker"),
            "name": company.get("name")
        },
        "resource_summary": summary,
        "all_estimates": estimates
    }


# =============================================================================
# PROJECT NAV (Net Asset Value)
# =============================================================================

@app.get("/api/projects/{project_id}/nav")
def get_project_nav_endpoint(project_id: int):
    """
    Get computed NAV for a project at current metal prices.
    Uses DCF adjustment or in-situ valuation based on available data.
    """
    from nav_calculator import cache_project_nav, calculate_project_nav
    
    nav_data = calculate_project_nav(project_id)
    
    # Cache the result
    if nav_data.get('nav_million') is not None:
        try:
            cache_project_nav(project_id, nav_data)
        except Exception:
            pass  # Don't fail if caching fails
    
    return nav_data


@app.get("/api/companies/{ticker}/nav")
def get_company_nav_endpoint(ticker: str):
    """
    Get aggregated NAV for all company projects.
    Includes NAV premium/discount vs market cap.
    """
    from nav_calculator import calculate_company_nav
    
    company = get_company(ticker.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")
    
    return calculate_company_nav(ticker.upper())


@app.get("/api/projects/{project_id}/sensitivity")
def get_project_sensitivity_endpoint(
    project_id: int,
    commodity: str = Query("gold", description="Commodity to analyze"),
    min_price: Optional[float] = Query(None, description="Min price for range"),
    max_price: Optional[float] = Query(None, description="Max price for range"),
    steps: int = Query(10, ge=5, le=20, description="Number of price points")
):
    """
    Get NAV sensitivity to commodity price changes.
    Returns NAV values at different price points for charting.
    """
    from nav_calculator import calculate_sensitivity
    
    return calculate_sensitivity(
        project_id,
        commodity=commodity,
        min_price=min_price,
        max_price=max_price,
        steps=steps
    )


# =============================================================================
# PROJECT COMPARISON
# =============================================================================

@app.get("/api/projects/compare")
def compare_projects_endpoint(
    project_ids: str = Query(..., description="Comma-separated project IDs, e.g., '1,5,12'")
):
    """
    Compare multiple projects side-by-side.
    Returns normalized metrics for comparison including NAV.
    """
    from nav_calculator import compare_projects
    
    try:
        ids = [int(x.strip()) for x in project_ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project_ids format. Use comma-separated integers.")
    
    if len(ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 projects can be compared at once.")
    
    return compare_projects(ids)


# =============================================================================
# M&A TRANSACTIONS
# =============================================================================

@app.get("/api/transactions")
def list_transactions(
    commodity: Optional[str] = Query(None, description="Filter by commodity"),
    stage: Optional[str] = Query(None, description="Filter by project stage"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    min_value: Optional[float] = Query(None, description="Minimum deal value (millions)"),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List M&A transactions with optional filters.
    """
    from db_manager import db_connection
    
    with db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM ma_transactions WHERE 1=1"
        params = []
        
        if commodity:
            query += " AND commodity = ?"
            params.append(commodity)
        if stage:
            query += " AND stage = ?"
            params.append(stage)
        if transaction_type:
            query += " AND transaction_type = ?"
            params.append(transaction_type)
        if min_value:
            query += " AND deal_value_million >= ?"
            params.append(min_value)
        
        query += " ORDER BY announcement_date DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
    
    return [dict(row) for row in rows]


@app.get("/api/transactions/{transaction_id}")
def get_transaction(transaction_id: int):
    """Get details of a specific M&A transaction."""
    from db_manager import db_connection
    
    with db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ma_transactions WHERE id = ?", (transaction_id,))
        row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return dict(row)


@app.get("/api/transactions/comparables")
def get_comparable_transactions(
    commodity: str = Query(..., description="Commodity to match"),
    stage: Optional[str] = Query(None, description="Project stage to match"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get comparable transactions for valuation.
    Returns recent deals with similar characteristics.
    """
    from db_manager import db_connection
    
    with db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT *, 
                deal_value_million / NULLIF(contained_gold_moz, 0) as implied_price_per_oz
            FROM ma_transactions 
            WHERE commodity = ?
        """
        params = [commodity]
        
        if stage:
            query += " AND stage = ?"
            params.append(stage)
        
        query += " ORDER BY announcement_date DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
    
    transactions = [dict(row) for row in rows]
    
    # Calculate average metrics
    avg_price_per_oz = None
    prices = [t.get('price_per_oz') for t in transactions if t.get('price_per_oz')]
    if prices:
        avg_price_per_oz = sum(prices) / len(prices)
    
    return {
        "commodity": commodity,
        "stage": stage,
        "transactions": transactions,
        "count": len(transactions),
        "avg_price_per_oz": round(avg_price_per_oz, 2) if avg_price_per_oz else None
    }


# =============================================================================
# JOB TRACKING
# =============================================================================

@app.get("/api/jobs")
def get_jobs(
    job_name: Optional[str] = Query(None, description="Filter by job name"),
    status: Optional[str] = Query(None, enum=["pending", "running", "success", "failed", "partial"]),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get recent job executions.
    - job_name: Filter by job name (e.g., "fetch_stock_prices")
    - status: Filter by job status
    """
    from job_tracker import JobStatus, get_tracker

    tracker = get_tracker()
    status_enum = JobStatus(status) if status else None

    return tracker.get_recent_jobs(
        job_name=job_name,
        limit=limit,
        status=status_enum
    )


@app.get("/api/jobs/running")
def get_running_jobs():
    """Get currently running jobs."""
    from job_tracker import get_tracker

    tracker = get_tracker()
    return tracker.get_running_jobs()


@app.get("/api/jobs/stats")
def get_jobs_stats(
    job_name: Optional[str] = Query(None, description="Filter by job name"),
    hours: int = Query(24, ge=1, le=168, description="Hours of history to include")
):
    """
    Get job execution statistics.
    - job_name: Get stats for specific job (or all jobs if not specified)
    - hours: Time window for statistics (default 24 hours)
    """
    from datetime import timedelta

    from job_tracker import get_tracker

    tracker = get_tracker()
    since = datetime.now() - timedelta(hours=hours)

    if job_name:
        return tracker.get_job_stats(job_name, since=since)
    else:
        return tracker.get_all_stats(since=since)


@app.get("/api/jobs/{job_name}/stats")
def get_job_stats(job_name: str, hours: int = Query(24, ge=1, le=168)):
    """Get statistics for a specific job."""
    from datetime import timedelta

    from job_tracker import get_tracker

    tracker = get_tracker()
    since = datetime.now() - timedelta(hours=hours)

    return tracker.get_job_stats(job_name, since=since)


# =============================================================================
# EXTRACTION ADMIN (Queue management)
# =============================================================================

@app.get("/api/extraction/stats")
def get_extraction_statistics():
    """Get extraction queue statistics."""
    return get_extraction_queue_stats()


@app.get("/api/extraction/queue")
def get_extraction_queue(
    status: Optional[str] = Query(None, enum=["pending", "processing", "completed", "failed"]),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Get extraction queue jobs.
    - status: Filter by job status
    """
    return get_extraction_queue_jobs(status=status, limit=limit)


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
