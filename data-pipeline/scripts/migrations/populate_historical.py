"""
Historical Data Population Script
Populates the database with:
1. Historical price data (5 years OHLCV)
2. Financial statements (income, balance, cashflow)
3. Current market data

NOTE: Companies are loaded from the database (official list of 203 companies).
      Use seed_data/official_tracked_companies.csv to review/update the list.

Usage:
    python populate_historical.py --all           # Everything
    python populate_historical.py --prices        # Historical prices
    python populate_historical.py --financials    # Financial statements
    python populate_historical.py --market        # Current market data
    python populate_historical.py --stats         # Show database stats
"""

import sqlite3
import os
import sys
import time
import logging
import argparse
from datetime import datetime, timedelta

import yfinance as yf

# Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
DB_PATH = os.path.join(os.path.dirname(__file__), "database", "mining.db")


# =============================================================================
# DATABASE FUNCTIONS
# =============================================================================

def get_connection():
    """Connect to the existing database with 203 companies."""
    if not os.path.exists(DB_PATH):
        logging.error(f"Database not found: {DB_PATH}")
        logging.error("Run init_tables.py first to create the database schema.")
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def verify_database():
    """Verify database exists and has companies."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM companies")
    count = cursor.fetchone()[0]
    conn.close()

    if count == 0:
        logging.error("No companies in database. Load the official list first.")
        sys.exit(1)

    logging.info(f"Database verified: {count} companies found.")


def get_yf_ticker(ticker: str, exchange: str) -> str:
    """Convert ticker to yfinance format."""
    if exchange in ["NYSE", "NASDAQ"]:
        return ticker
    elif exchange == "TSXV":
        return f"{ticker}.V"
    else:  # TSX
        return f"{ticker}.TO"


# =============================================================================
# POPULATION FUNCTIONS
# =============================================================================

def populate_market_data():
    """Fetch current market data for all companies."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, ticker, exchange FROM companies")
    companies = cursor.fetchall()

    logging.info(f"Updating market data for {len(companies)} companies...")

    for i, row in enumerate(companies):
        company_id, ticker, exchange = row['id'], row['ticker'], row['exchange']
        yf_ticker = get_yf_ticker(ticker, exchange)

        try:
            stock = yf.Ticker(yf_ticker)
            info = stock.info

            current_price = info.get("currentPrice") or info.get("regularMarketPrice")
            market_cap = info.get("marketCap")
            high_52w = info.get("fiftyTwoWeekHigh")
            low_52w = info.get("fiftyTwoWeekLow")
            avg_volume = info.get("averageVolume")
            currency = info.get("currency", "CAD")

            if current_price:
                cursor.execute('''
                    UPDATE companies
                    SET current_price=?, market_cap=?, high_52w=?, low_52w=?,
                        avg_volume=?, currency=?, last_updated=?
                    WHERE id=?
                ''', (current_price, market_cap, high_52w, low_52w,
                      avg_volume, currency, datetime.now(), company_id))
                logging.info(f"[{i+1}/{len(companies)}] {ticker}: ${current_price:.2f} {currency}")
            else:
                logging.warning(f"[{i+1}/{len(companies)}] {ticker}: No price data")

        except Exception as e:
            logging.error(f"[{i+1}/{len(companies)}] {ticker}: Error - {e}")

        time.sleep(0.3)  # Rate limiting

    conn.commit()
    conn.close()
    logging.info("Market data update complete.")


def populate_price_history(years: int = 5):
    """Fetch historical OHLCV data for all companies."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, ticker, exchange FROM companies")
    companies = cursor.fetchall()

    period = f"{years}y"
    logging.info(f"Fetching {years} years of price history for {len(companies)} companies...")

    total_rows = 0

    for i, row in enumerate(companies):
        company_id, ticker, exchange = row['id'], row['ticker'], row['exchange']
        yf_ticker = get_yf_ticker(ticker, exchange)

        try:
            stock = yf.Ticker(yf_ticker)
            hist = stock.history(period=period)

            if hist.empty:
                logging.warning(f"[{i+1}/{len(companies)}] {ticker}: No history")
                continue

            rows_added = 0
            for date, data in hist.iterrows():
                try:
                    cursor.execute('''
                        INSERT OR REPLACE INTO price_history
                        (company_id, date, open, high, low, close, adj_close, volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (company_id, date.strftime('%Y-%m-%d'),
                          data.get('Open'), data.get('High'), data.get('Low'),
                          data.get('Close'), data.get('Close'), int(data.get('Volume', 0))))
                    rows_added += 1
                except Exception as e:
                    pass

            total_rows += rows_added
            logging.info(f"[{i+1}/{len(companies)}] {ticker}: {rows_added} days")

        except Exception as e:
            logging.error(f"[{i+1}/{len(companies)}] {ticker}: Error - {e}")

        time.sleep(0.3)

    conn.commit()
    conn.close()
    logging.info(f"Price history complete. {total_rows} total rows added.")


def populate_financials():
    """Fetch financial statements for all companies."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, ticker, exchange FROM companies")
    companies = cursor.fetchall()

    logging.info(f"Fetching financials for {len(companies)} companies...")

    for i, row in enumerate(companies):
        company_id, ticker, exchange = row['id'], row['ticker'], row['exchange']
        yf_ticker = get_yf_ticker(ticker, exchange)

        try:
            stock = yf.Ticker(yf_ticker)

            # Income Statement (Annual)
            income = stock.income_stmt
            if income is not None and not income.empty:
                for col in income.columns:
                    period_end = col.strftime('%Y-%m-%d') if hasattr(col, 'strftime') else str(col)
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO financials
                            (company_id, statement_type, period_type, period_end,
                             total_revenue, gross_profit, operating_income, net_income, ebitda)
                            VALUES (?, 'income', 'annual', ?, ?, ?, ?, ?, ?)
                        ''', (company_id, period_end,
                              _safe_get(income, 'Total Revenue', col),
                              _safe_get(income, 'Gross Profit', col),
                              _safe_get(income, 'Operating Income', col),
                              _safe_get(income, 'Net Income', col),
                              _safe_get(income, 'EBITDA', col)))
                    except Exception:
                        pass

            # Balance Sheet (Annual)
            balance = stock.balance_sheet
            if balance is not None and not balance.empty:
                for col in balance.columns:
                    period_end = col.strftime('%Y-%m-%d') if hasattr(col, 'strftime') else str(col)
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO financials
                            (company_id, statement_type, period_type, period_end,
                             total_assets, total_liabilities, total_equity,
                             cash_and_equivalents, total_debt)
                            VALUES (?, 'balance', 'annual', ?, ?, ?, ?, ?, ?)
                        ''', (company_id, period_end,
                              _safe_get(balance, 'Total Assets', col),
                              _safe_get(balance, 'Total Liabilities Net Minority Interest', col),
                              _safe_get(balance, 'Total Equity Gross Minority Interest', col),
                              _safe_get(balance, 'Cash And Cash Equivalents', col),
                              _safe_get(balance, 'Total Debt', col)))
                    except Exception:
                        pass

            # Cash Flow (Annual)
            cashflow = stock.cashflow
            if cashflow is not None and not cashflow.empty:
                for col in cashflow.columns:
                    period_end = col.strftime('%Y-%m-%d') if hasattr(col, 'strftime') else str(col)
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO financials
                            (company_id, statement_type, period_type, period_end,
                             operating_cash_flow, investing_cash_flow, financing_cash_flow,
                             free_cash_flow, capital_expenditures)
                            VALUES (?, 'cashflow', 'annual', ?, ?, ?, ?, ?, ?)
                        ''', (company_id, period_end,
                              _safe_get(cashflow, 'Operating Cash Flow', col),
                              _safe_get(cashflow, 'Investing Cash Flow', col),
                              _safe_get(cashflow, 'Financing Cash Flow', col),
                              _safe_get(cashflow, 'Free Cash Flow', col),
                              _safe_get(cashflow, 'Capital Expenditure', col)))
                    except Exception:
                        pass

            logging.info(f"[{i+1}/{len(companies)}] {ticker}: Financials loaded")

        except Exception as e:
            logging.error(f"[{i+1}/{len(companies)}] {ticker}: Error - {e}")

        time.sleep(0.5)  # Slightly longer delay for financials

    conn.commit()
    conn.close()
    logging.info("Financials complete.")


def _safe_get(df, row_name, col):
    """Safely get a value from a DataFrame."""
    try:
        if row_name in df.index:
            val = df.loc[row_name, col]
            if val is not None and str(val) != 'nan':
                return float(val)
    except (KeyError, TypeError, ValueError):
        pass
    return None


def show_stats():
    """Show database statistics."""
    conn = get_connection()
    cursor = conn.cursor()

    print("\n" + "="*50)
    print("DATABASE STATISTICS")
    print("="*50)

    cursor.execute("SELECT COUNT(*) FROM companies")
    print(f"Companies:      {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM price_history")
    print(f"Price History:  {cursor.fetchone()[0]} rows")

    cursor.execute("SELECT COUNT(*) FROM financials")
    print(f"Financials:     {cursor.fetchone()[0]} rows")

    cursor.execute("SELECT COUNT(*) FROM companies WHERE current_price IS NOT NULL")
    print(f"With Prices:    {cursor.fetchone()[0]}")

    cursor.execute("SELECT commodity, COUNT(*) FROM companies GROUP BY commodity ORDER BY COUNT(*) DESC")
    print("\nBy Commodity:")
    for row in cursor.fetchall():
        print(f"  {row[0] or 'Unknown':12} {row[1]}")

    conn.close()


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Populate historical mining data")
    parser.add_argument("--all", action="store_true", help="Run all population steps")
    parser.add_argument("--market", action="store_true", help="Current market data")
    parser.add_argument("--prices", action="store_true", help="Historical prices (5 years)")
    parser.add_argument("--financials", action="store_true", help="Financial statements")
    parser.add_argument("--stats", action="store_true", help="Show statistics")

    args = parser.parse_args()

    # Verify database has companies
    verify_database()

    if args.stats:
        show_stats()
        sys.exit(0)

    if args.all or args.market:
        populate_market_data()

    if args.all or args.prices:
        populate_price_history(years=5)

    if args.all or args.financials:
        populate_financials()

    if not any([args.all, args.market, args.prices, args.financials]):
        print("Historical Data Population Script")
        print("="*40)
        print("\nNOTE: Companies are loaded from the database (203 companies).")
        print("      See: seed_data/official_tracked_companies.csv")
        print("\nUsage:")
        print("  python populate_historical.py --all         # Everything (takes ~30 min)")
        print("  python populate_historical.py --market      # Current prices")
        print("  python populate_historical.py --prices      # 5 years OHLCV")
        print("  python populate_historical.py --financials  # Income/Balance/Cashflow")
        print("  python populate_historical.py --stats       # Show stats")

    show_stats()
