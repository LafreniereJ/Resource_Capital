"""
TSX Mining Companies Manager.
Handles loading and managing the list of TSX/TSXV mining companies.
"""

import csv
import os
from typing import Dict, List

from db_manager import get_all_companies, get_stats, init_db, upsert_company

# Starter list of TSX/TSXV mining companies
# Format: (ticker, name, exchange, commodity)
# This can be expanded or loaded from CSV
TSX_MINING_COMPANIES = [
    # Major Gold Producers
    ("ABX", "Barrick Gold Corporation", "TSX", "Gold"),
    ("K", "Kinross Gold Corporation", "TSX", "Gold"),
    ("AEM", "Agnico Eagle Mines Limited", "TSX", "Gold"),
    ("YRI", "Yamana Gold Inc.", "TSX", "Gold"),
    ("ELD", "Eldorado Gold Corporation", "TSX", "Gold"),
    ("IMG", "IAMGOLD Corporation", "TSX", "Gold"),
    ("BTO", "B2Gold Corp.", "TSX", "Gold"),
    ("OGC", "OceanaGold Corporation", "TSX", "Gold"),
    ("SSL", "Sandstorm Gold Ltd.", "TSX", "Gold"),
    ("OR", "Osisko Gold Royalties Ltd", "TSX", "Gold"),
    ("WPM", "Wheaton Precious Metals Corp.", "TSX", "Gold"),
    ("FNV", "Franco-Nevada Corporation", "TSX", "Gold"),

    # Mid-Tier Gold
    ("EDV", "Endeavour Mining plc", "TSX", "Gold"),
    ("LUG", "Lundin Gold Inc.", "TSX", "Gold"),
    ("TXG", "Torex Gold Resources Inc.", "TSX", "Gold"),
    ("NGD", "New Gold Inc.", "TSX", "Gold"),
    ("SEA", "Seabridge Gold Inc.", "TSX", "Gold"),
    ("DPM", "Dundee Precious Metals Inc.", "TSX", "Gold"),
    ("WDO", "Wesdome Gold Mines Ltd.", "TSX", "Gold"),
    ("KNT", "K92 Mining Inc.", "TSX", "Gold"),

    # Junior Gold / Exploration
    ("SBB", "Sabina Gold & Silver Corp.", "TSX", "Gold"),
    ("MAG", "MAG Silver Corp.", "TSX", "Silver"),
    ("FR", "First Majestic Silver Corp.", "TSX", "Silver"),
    ("PAAS", "Pan American Silver Corp.", "TSX", "Silver"),

    # Copper Producers
    ("FM", "First Quantum Minerals Ltd.", "TSX", "Copper"),
    ("HBM", "Hudbay Minerals Inc.", "TSX", "Copper"),
    ("TKO", "Taseko Mines Limited", "TSX", "Copper"),
    ("CS", "Capstone Copper Corp.", "TSX", "Copper"),
    ("LUN", "Lundin Mining Corporation", "TSX", "Copper"),
    ("ERO", "Ero Copper Corp.", "TSX", "Copper"),

    # Nickel
    ("NICU", "Magna Mining Inc.", "TSXV", "Nickel"),
    ("NMX", "North American Nickel Inc.", "TSXV", "Nickel"),
    ("FPX", "FPX Nickel Corp.", "TSXV", "Nickel"),
    ("GIGA", "Giga Metals Corporation", "TSXV", "Nickel"),

    # Lithium
    ("LAC", "Lithium Americas Corp.", "TSX", "Lithium"),
    ("SLI", "Standard Lithium Ltd.", "TSXV", "Lithium"),
    ("LI", "Li-Cycle Holdings Corp.", "TSX", "Lithium"),
    ("SGM", "Sigma Lithium Corporation", "TSXV", "Lithium"),
    ("LTHM", "Livent Corporation", "TSX", "Lithium"),

    # Uranium
    ("CCO", "Cameco Corporation", "TSX", "Uranium"),
    ("NXE", "NexGen Energy Ltd.", "TSX", "Uranium"),
    ("DML", "Denison Mines Corp.", "TSX", "Uranium"),
    ("FCU", "Fission Uranium Corp.", "TSX", "Uranium"),
    ("URE", "Ur-Energy Inc.", "TSX", "Uranium"),

    # Zinc/Lead
    ("TKO", "Teck Resources Limited", "TSX", "Diversified"),
    ("ZN", "Zinc One Resources Inc.", "TSXV", "Zinc"),

    # PGMs (Platinum Group Metals)
    ("PDL", "North American Palladium", "TSX", "PGM"),
    ("PLG", "Platinum Group Metals Ltd.", "TSX", "PGM"),

    # Diversified Miners
    ("TECK.A", "Teck Resources Limited", "TSX", "Diversified"),
    ("TECK.B", "Teck Resources Limited", "TSX", "Diversified"),
    ("IVN", "Ivanhoe Mines Ltd.", "TSX", "Diversified"),

    # Additional TSX/TSXV Found
    ("ABRA", "AbraSilver Resource Corp.", "TSX", "Silver"),
    ("ARA", "Aclara Resources Inc.", "TSX", "Rare Earths"),
    ("ALK", "Alkane Resources Limited", "TSX", "Gold"),
    ("AAUC", "Allied Gold Corporation", "TSX", "Gold"),
    ("AII", "Almonty Industries Inc.", "TSX", "Tungsten"),
    ("AFM", "Alphamin Resources Corp.", "TSXV", "Tin"),
    ("ATCU", "Alta Copper Corp.", "TSX", "Copper"),
    ("ALT", "Alturas Minerals Corp.", "TSXV", "Copper"),
    ("AMRQ", "Amaroq Ltd.", "TSXV", "Gold"),
    ("ARIS", "Aris Mining Corporation", "TSX", "Gold"),
    ("AGLD", "Austral Gold Limited", "TSXV", "Gold"),
    ("AUM", "AuMega Metals Ltd", "TSXV", "Gold"),
    ("ASM", "Avino Silver & Gold Mines Ltd.", "TSX", "Silver"),
    ("CGG", "China Gold International Resources", "TSX", "Gold"),
    ("GAU", "Galiano Gold", "TSX", "Gold"),
    ("SKE", "Skeena Resources", "TSX", "Gold"),
    ("LUN", "Lundin Mining", "TSX", "Copper"), # Ensure no dupes, existed as LUN above? Yes.
]


def load_companies_to_db() -> int:
    """Load all TSX mining companies into the database. Returns count loaded."""
    init_db()
    count = 0
    for ticker, name, exchange, commodity in TSX_MINING_COMPANIES:
        try:
            upsert_company(
                ticker=ticker,
                name=name,
                exchange=exchange,
                commodity=commodity
            )
            count += 1
            print(f"  ✓ {ticker}: {name}")
        except Exception as e:
            print(f"  ✗ {ticker}: {e}")
    return count


def load_from_csv(csv_path: str) -> int:
    """
    Load companies from a CSV file.
    Expected columns: ticker, name, exchange, commodity
    """
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        return 0

    count = 0
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                upsert_company(
                    ticker=row['ticker'],
                    name=row['name'],
                    exchange=row.get('exchange', 'TSX'),
                    commodity=row.get('commodity')
                )
                count += 1
            except Exception as e:
                print(f"Error loading {row.get('ticker')}: {e}")

    return count


def export_to_csv(csv_path: str) -> int:
    """Export all companies to a CSV file for editing."""
    companies = get_all_companies()

    with open(csv_path, 'w', newline='') as f:
        fieldnames = ['ticker', 'name', 'exchange', 'commodity', 'website']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for company in companies:
            writer.writerow({
                'ticker': company['ticker'],
                'name': company['name'],
                'exchange': company['exchange'],
                'commodity': company.get('commodity', ''),
                'website': company.get('website', '')
            })

    return len(companies)


def get_companies_by_commodity(commodity: str) -> List[Dict]:
    """Get all companies for a specific commodity."""
    companies = get_all_companies()
    return [c for c in companies if c.get('commodity', '').lower() == commodity.lower()]


def print_summary():
    """Print a summary of companies in the database."""
    companies = get_all_companies()

    # Count by commodity
    commodities = {}
    for c in companies:
        comm = c.get('commodity') or 'Unknown'
        commodities[comm] = commodities.get(comm, 0) + 1

    # Count by exchange
    exchanges = {}
    for c in companies:
        ex = c.get('exchange') or 'Unknown'
        exchanges[ex] = exchanges.get(ex, 0) + 1

    print("\n" + "="*50)
    print("TSX MINING COMPANIES SUMMARY")
    print("="*50)
    print(f"\nTotal Companies: {len(companies)}")

    print("\nBy Commodity:")
    for comm, count in sorted(commodities.items(), key=lambda x: -x[1]):
        print(f"  {comm}: {count}")

    print("\nBy Exchange:")
    for ex, count in sorted(exchanges.items(), key=lambda x: -x[1]):
        print(f"  {ex}: {count}")


if __name__ == "__main__":
    print("Loading TSX Mining Companies...")
    print("-" * 40)
    count = load_companies_to_db()
    print("-" * 40)
    print(f"\nLoaded {count} companies.")

    print_summary()

    # Show stats
    stats = get_stats()
    print(f"\nDatabase Stats: {stats}")
