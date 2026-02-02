import pandas as pd
import sqlite3
import os
import sys

# Add processing path
sys.path.append(os.path.join(os.path.dirname(__file__), 'data-pipeline', 'processing'))
from db_manager import upsert_company, init_db

FILE_PATH = r"C:\Users\jamie\Downloads\mining-companies-listed-on-tsx-and-tsxv-2025-12-17-en.xlsx"
DB_PATH = os.path.join(os.path.dirname(__file__), "database/mining.db")

def determine_commodity(row):
    commodities = []
    mapping = {
        'Gold': 'Gold', 'Silver': 'Silver', 'Copper': 'Copper', 'Lithium': 'Lithium',
        'Uranium': 'Uranium', 'Nickel': 'Nickel', 'Zince': 'Zinc', 'Lead': 'Lead',
        'Rare Earths': 'Rare Earths', 'Potash': 'Potash', 'Diamond': 'Diamonds',
        'Coal': 'Coal', 'Molybdenum': 'Molybdenum', 'Platinum/PGM': 'PGM',
        'Iron': 'Iron', 'Tungsten': 'Tungsten'
    }
    
    for col, name in mapping.items():
        if col in row and row[col] == 'Y':
            commodities.append(name)
            
    if not commodities: return "Diversified"
    if len(commodities) == 1: return commodities[0]
    if 'Gold' in commodities: return 'Gold'
    if 'Copper' in commodities: return 'Copper'
    if 'Lithium' in commodities: return 'Lithium'
    if 'Uranium' in commodities: return 'Uranium'
    return ", ".join(commodities[:2])

def import_excel():
    if not os.path.exists(FILE_PATH):
        print(f"File not found: {FILE_PATH}")
        return

    abs_db_path = os.path.abspath(DB_PATH)
    print(f"Target DB Path: {abs_db_path}")
    
    if not os.path.exists(os.path.dirname(abs_db_path)):
        print(f"Directory invalid: {os.path.dirname(abs_db_path)}")
        return

    print("Importing companies and market cap...")
    conn = sqlite3.connect(abs_db_path)
    cursor = conn.cursor()
    
    xls = pd.ExcelFile(FILE_PATH)
    total_imported = 0
    
    for sheet in xls.sheet_names:
        print(f"Processing {sheet}...")
        df = pd.read_excel(FILE_PATH, sheet_name=sheet, header=9)
        
        for _, row in df.iterrows():
            try:
                ticker = str(row.get('Root\nTicker', '')).strip()
                name = str(row.get('Name', '')).strip()
                exchange = str(row.get('Exchange', 'TSX')).strip()
                
                if not ticker or ticker == 'nan':
                    continue
                    
                commodity = determine_commodity(row)
                
                # Market Cap
                mcap_col = [c for c in df.columns if 'Market Cap' in c][0]
                market_cap = row.get(mcap_col, 0)
                try:
                    market_cap = float(market_cap)
                except:
                    market_cap = 0
                
                # Direct Upsert
                cursor.execute("SELECT id FROM companies WHERE ticker = ?", (ticker,))
                existing = cursor.fetchone()
                
                if existing:
                    cursor.execute('''
                        UPDATE companies SET name = ?, exchange = ?, commodity = ?, market_cap = ?
                        WHERE ticker = ?
                    ''', (name, exchange, commodity, market_cap, ticker))
                else:
                    cursor.execute('''
                        INSERT INTO companies (name, ticker, exchange, commodity, market_cap)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (name, ticker, exchange, commodity, market_cap))
                
                total_imported += 1
                if total_imported % 100 == 0:
                    print(f"  Processed {total_imported}...")
                    
            except Exception as e:
                print(f"  Error importing row: {e}")
    
    conn.commit()
    conn.close()
    print(f"\nSuccessfully imported {total_imported} companies.")

if __name__ == "__main__":
    import_excel()
