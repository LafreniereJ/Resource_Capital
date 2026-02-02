"""
Financial Data Ingestion Module
Fetches historical financial statements (income, balance sheet, cash flow)
and price history for mining companies.

Primary source: yfinance (free, no API key required)
"""

import logging
import os
import sqlite3
import sys
from typing import Dict

import pandas as pd
import yfinance as yf

# Add parent dir to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))

from config import get_yf_ticker
from db_manager import get_all_companies, get_company

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'mining.db')


def get_db_connection():
    return sqlite3.connect(DB_PATH)


# =============================================================================
# FINANCIAL STATEMENTS
# =============================================================================

def fetch_financials(ticker: str, exchange: str = "TSX") -> Dict:
    """
    Fetch all financial statements for a company.
    Returns dict with income_statement, balance_sheet, cash_flow DataFrames.
    """
    yf_ticker = get_yf_ticker(ticker, exchange)
    logging.info(f"Fetching financials for {yf_ticker}...")

    try:
        stock = yf.Ticker(yf_ticker)

        result = {
            "ticker": ticker,
            "yf_ticker": yf_ticker,
            "income_annual": stock.income_stmt,
            "income_quarterly": stock.quarterly_income_stmt,
            "balance_annual": stock.balance_sheet,
            "balance_quarterly": stock.quarterly_balance_sheet,
            "cashflow_annual": stock.cashflow,
            "cashflow_quarterly": stock.quarterly_cashflow,
            "info": stock.info
        }

        # Log what we got
        for key, df in result.items():
            if isinstance(df, pd.DataFrame) and not df.empty:
                logging.info(f"  {key}: {len(df.columns)} periods")

        return result

    except Exception as e:
        logging.error(f"Failed to fetch financials for {yf_ticker}: {e}")
        return {}


def save_financials_to_db(company_id: int, financials: Dict):
    """
    Save financial statement data to the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    saved_count = 0

    # Process each statement type
    for stmt_type, period_type, df_key in [
        ("income", "annual", "income_annual"),
        ("income", "quarterly", "income_quarterly"),
        ("balance", "annual", "balance_annual"),
        ("balance", "quarterly", "balance_quarterly"),
        ("cashflow", "annual", "cashflow_annual"),
        ("cashflow", "quarterly", "cashflow_quarterly"),
    ]:
        df = financials.get(df_key)
        if df is None or df.empty:
            continue

        # Each column is a period (date)
        for period_date in df.columns:
            try:
                period_end = period_date.strftime("%Y-%m-%d") if hasattr(period_date, 'strftime') else str(period_date)[:10]

                # Extract values based on statement type
                data = {
                    "company_id": company_id,
                    "statement_type": stmt_type,
                    "period_type": period_type,
                    "period_end": period_end,
                    "currency": financials.get("info", {}).get("currency", "USD"),
                }

                if stmt_type == "income":
                    data.update(_extract_income_data(df, period_date))
                elif stmt_type == "balance":
                    data.update(_extract_balance_data(df, period_date))
                elif stmt_type == "cashflow":
                    data.update(_extract_cashflow_data(df, period_date))

                # Upsert into database
                _upsert_financial(cursor, data)
                saved_count += 1

            except Exception as e:
                logging.warning(f"Error processing {stmt_type} for {period_date}: {e}")
                continue

    conn.commit()
    conn.close()
    logging.info(f"Saved {saved_count} financial records for company {company_id}")
    return saved_count


def _extract_income_data(df: pd.DataFrame, period) -> Dict:
    """Extract income statement fields from DataFrame."""
    def get_val(keys):
        for key in keys:
            if key in df.index:
                val = df.loc[key, period]
                if pd.notna(val):
                    return float(val)
        return None

    return {
        "total_revenue": get_val(["Total Revenue", "Revenue", "Total Operating Revenue"]),
        "cost_of_revenue": get_val(["Cost Of Revenue", "Cost of Revenue"]),
        "gross_profit": get_val(["Gross Profit"]),
        "operating_expenses": get_val(["Operating Expense", "Total Operating Expenses"]),
        "operating_income": get_val(["Operating Income", "EBIT"]),
        "net_income": get_val(["Net Income", "Net Income Common Stockholders"]),
        "ebitda": get_val(["EBITDA", "Normalized EBITDA"]),
        "eps_basic": get_val(["Basic EPS"]),
        "eps_diluted": get_val(["Diluted EPS"]),
    }


def _extract_balance_data(df: pd.DataFrame, period) -> Dict:
    """Extract balance sheet fields from DataFrame."""
    def get_val(keys):
        for key in keys:
            if key in df.index:
                val = df.loc[key, period]
                if pd.notna(val):
                    return float(val)
        return None

    return {
        "total_assets": get_val(["Total Assets"]),
        "total_liabilities": get_val(["Total Liabilities Net Minority Interest", "Total Liabilities"]),
        "total_equity": get_val(["Total Equity Gross Minority Interest", "Stockholders Equity", "Total Stockholders Equity"]),
        "cash_and_equivalents": get_val(["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"]),
        "total_debt": get_val(["Total Debt", "Long Term Debt"]),
        "current_assets": get_val(["Current Assets"]),
        "current_liabilities": get_val(["Current Liabilities"]),
    }


def _extract_cashflow_data(df: pd.DataFrame, period) -> Dict:
    """Extract cash flow fields from DataFrame."""
    def get_val(keys):
        for key in keys:
            if key in df.index:
                val = df.loc[key, period]
                if pd.notna(val):
                    return float(val)
        return None

    return {
        "operating_cash_flow": get_val(["Operating Cash Flow", "Cash Flow From Continuing Operating Activities"]),
        "investing_cash_flow": get_val(["Investing Cash Flow", "Cash Flow From Continuing Investing Activities"]),
        "financing_cash_flow": get_val(["Financing Cash Flow", "Cash Flow From Continuing Financing Activities"]),
        "free_cash_flow": get_val(["Free Cash Flow"]),
        "capital_expenditures": get_val(["Capital Expenditure", "Capital Expenditures"]),
    }


def _upsert_financial(cursor, data: Dict):
    """Insert or update financial record."""
    # Build column lists
    columns = list(data.keys())
    placeholders = ", ".join(["?" for _ in columns])
    column_names = ", ".join(columns)

    # SQLite upsert
    sql = f"""
        INSERT INTO financials ({column_names})
        VALUES ({placeholders})
        ON CONFLICT(company_id, statement_type, period_type, period_end)
        DO UPDATE SET {", ".join([f"{col} = excluded.{col}" for col in columns if col not in ["company_id", "statement_type", "period_type", "period_end"]])}
    """

    cursor.execute(sql, list(data.values()))


# =============================================================================
# PRICE HISTORY
# =============================================================================

def fetch_price_history(ticker: str, exchange: str = "TSX", period: str = "5y") -> pd.DataFrame:
    """
    Fetch historical price data.
    period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    """
    yf_ticker = get_yf_ticker(ticker, exchange)
    logging.info(f"Fetching price history for {yf_ticker} ({period})...")

    try:
        stock = yf.Ticker(yf_ticker)
        hist = stock.history(period=period)

        if hist.empty:
            logging.warning(f"No price history for {yf_ticker}")
            return pd.DataFrame()

        logging.info(f"  Got {len(hist)} price records")
        return hist

    except Exception as e:
        logging.error(f"Failed to fetch price history for {yf_ticker}: {e}")
        return pd.DataFrame()


def save_price_history_to_db(company_id: int, history: pd.DataFrame):
    """Save price history to database."""
    if history.empty:
        return 0

    conn = get_db_connection()
    cursor = conn.cursor()

    saved_count = 0

    for date, row in history.iterrows():
        try:
            date_str = date.strftime("%Y-%m-%d") if hasattr(date, 'strftime') else str(date)[:10]

            cursor.execute("""
                INSERT INTO price_history (company_id, date, open, high, low, close, adj_close, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(company_id, date) DO UPDATE SET
                    open = excluded.open,
                    high = excluded.high,
                    low = excluded.low,
                    close = excluded.close,
                    adj_close = excluded.adj_close,
                    volume = excluded.volume
            """, (
                company_id,
                date_str,
                float(row.get("Open", 0)) if pd.notna(row.get("Open")) else None,
                float(row.get("High", 0)) if pd.notna(row.get("High")) else None,
                float(row.get("Low", 0)) if pd.notna(row.get("Low")) else None,
                float(row.get("Close", 0)) if pd.notna(row.get("Close")) else None,
                float(row.get("Close", 0)) if pd.notna(row.get("Close")) else None,  # adj_close
                int(row.get("Volume", 0)) if pd.notna(row.get("Volume")) else None,
            ))
            saved_count += 1

        except Exception as e:
            logging.warning(f"Error saving price for {date}: {e}")
            continue

    conn.commit()
    conn.close()
    logging.info(f"Saved {saved_count} price records for company {company_id}")
    return saved_count


# =============================================================================
# BATCH OPERATIONS
# =============================================================================

def update_all_financials():
    """Update financials for all companies in database."""
    companies = get_all_companies()
    logging.info(f"Updating financials for {len(companies)} companies...")

    results = {"success": 0, "failed": 0}

    for company in companies:
        try:
            ticker = company["ticker"]
            exchange = company.get("exchange", "TSX")
            company_id = company["id"]

            logging.info(f"\n{'='*50}")
            logging.info(f"Processing {ticker} ({exchange})...")

            # Fetch and save financials
            financials = fetch_financials(ticker, exchange)
            if financials:
                save_financials_to_db(company_id, financials)
                results["success"] += 1
            else:
                results["failed"] += 1

        except Exception as e:
            logging.error(f"Error processing {company.get('ticker')}: {e}")
            results["failed"] += 1

    logging.info(f"\nFinancials update complete: {results['success']} success, {results['failed']} failed")
    return results


def update_all_price_history(period: str = "2y"):
    """Update price history for all companies."""
    companies = get_all_companies()
    logging.info(f"Updating price history for {len(companies)} companies ({period})...")

    results = {"success": 0, "failed": 0}

    for company in companies:
        try:
            ticker = company["ticker"]
            exchange = company.get("exchange", "TSX")
            company_id = company["id"]

            history = fetch_price_history(ticker, exchange, period)
            if not history.empty:
                save_price_history_to_db(company_id, history)
                results["success"] += 1
            else:
                results["failed"] += 1

        except Exception as e:
            logging.error(f"Error processing {company.get('ticker')}: {e}")
            results["failed"] += 1

    logging.info(f"\nPrice history update complete: {results['success']} success, {results['failed']} failed")
    return results


def update_company_financials(ticker: str):
    """Update financials for a single company."""
    company = get_company(ticker)
    if not company:
        logging.error(f"Company {ticker} not found in database")
        return False

    exchange = company.get("exchange", "TSX")
    company_id = company["id"]

    # Fetch and save financials
    financials = fetch_financials(ticker, exchange)
    if financials:
        save_financials_to_db(company_id, financials)

    # Fetch and save price history
    history = fetch_price_history(ticker, exchange, "2y")
    if not history.empty:
        save_price_history_to_db(company_id, history)

    return True


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Financial Data Ingestion")
    parser.add_argument("--ticker", type=str, help="Update single ticker")
    parser.add_argument("--all", action="store_true", help="Update all companies")
    parser.add_argument("--financials", action="store_true", help="Update financials only")
    parser.add_argument("--prices", action="store_true", help="Update price history only")
    parser.add_argument("--period", type=str, default="2y", help="Price history period (1y, 2y, 5y, max)")

    args = parser.parse_args()

    if args.ticker:
        logging.info(f"Updating {args.ticker}...")
        update_company_financials(args.ticker.upper())

    elif args.all:
        if args.financials:
            update_all_financials()
        elif args.prices:
            update_all_price_history(args.period)
        else:
            # Both
            update_all_financials()
            update_all_price_history(args.period)

    else:
        print("Financial Data Ingestion")
        print("=" * 40)
        print("\nUsage:")
        print("  python financials.py --ticker ABX       # Update single company")
        print("  python financials.py --all              # Update all companies")
        print("  python financials.py --all --financials # Financials only")
        print("  python financials.py --all --prices     # Price history only")
        print("  python financials.py --all --prices --period 5y  # Custom period")
