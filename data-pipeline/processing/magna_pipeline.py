import os
import re
import sqlite3

DB_PATH = "../database/mining.db"

def init_db():
    """Initializes the SQLite database with the schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Read schema from schema.sql
    # Note: schema.sql uses PostgreSQL syntax (SERIAL). We need to adapt it slightly for SQLite if executing raw.
    # For this script, I will just create the tables if they don't exist using SQLite syntax.
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ticker TEXT NOT NULL UNIQUE,
        exchange TEXT DEFAULT 'TSX',
        website TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER REFERENCES companies(id),
        name TEXT NOT NULL,
        location TEXT,
        stage TEXT,
        commodity TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS extracted_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id),
        metric_name TEXT NOT NULL,
        metric_value REAL,
        unit TEXT,
        raw_text_snippet TEXT,
        hole_id TEXT,
        interval_length REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    conn.commit()
    return conn

def ingest_magna_data(conn):
    cursor = conn.cursor()
    
    # 1. Insert Company (Magna Mining)
    try:
        cursor.execute("INSERT INTO companies (name, ticker, exchange) VALUES (?, ?, ?)", 
                       ("Magna Mining Inc.", "NICU", "TSXV"))
        company_id = cursor.lastrowid
        print(f"Inserted Magna Mining (ID: {company_id})")
    except sqlite3.IntegrityError:
        cursor.execute("SELECT id FROM companies WHERE ticker = ?", ("NICU",))
        company_id = cursor.fetchone()[0]
        print(f"Found Magna Mining (ID: {company_id})")
        
    # 2. Insert Project (Crean Hill)
    # Check if project exists
    cursor.execute("SELECT id FROM projects WHERE name = ? AND company_id = ?", ("Crean Hill", company_id))
    row = cursor.fetchone()
    if row:
        project_id = row[0]
        print(f"Found Crean Hill (ID: {project_id})")
    else:
        cursor.execute("INSERT INTO projects (company_id, name, location, stage, commodity) VALUES (?, ?, ?, ?, ?)",
                       (company_id, "Crean Hill", "Sudbury, Ontario", "Advanced Exploration", "Ni-Cu-PGM"))
        project_id = cursor.lastrowid
        print(f"Inserted Crean Hill (ID: {project_id})")

    # 3. Parse Text File
    file_path = "test_data/magna_press_release_jun25.txt"
    with open(file_path, "r") as f:
        content = f.read()

    # Regex to find table rows: | Hole ID | ...
    # Simple regex expecting: "| MCR... | ... |"
    # Capturing: Hole ID, Interval, Ni, Cu, TPM
    # Table columns: | Hole ID | From | To | Interval | Ni | Cu | Pt | Pd | Au | TPM |
    # Indices:         0        1      2    3          4    5    6    7    8    9
    
    # Let's find lines starting with | MCR
    rows = re.findall(r"\|\s*(MCR-[\d-]+)\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|.*\|\s*([\d.]+)\s*\|", content)
    
    print(f"Found {len(rows)} drill intercepts.")
    
    for row in rows:
        hole_id, interval, ni, cu, tpm = row
        # Insert each metric
        
        # Ni
        cursor.execute('''
            INSERT INTO extracted_metrics (project_id, metric_name, metric_value, unit, hole_id, interval_length, raw_text_snippet)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (project_id, "Ni Grade", float(ni), "%", hole_id, float(interval), f"Hole {hole_id}: {ni}% Ni over {interval}m"))
        
        # Cu
        cursor.execute('''
            INSERT INTO extracted_metrics (project_id, metric_name, metric_value, unit, hole_id, interval_length, raw_text_snippet)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (project_id, "Cu Grade", float(cu), "%", hole_id, float(interval), f"Hole {hole_id}: {cu}% Cu over {interval}m"))
        
        # TPM
        cursor.execute('''
            INSERT INTO extracted_metrics (project_id, metric_name, metric_value, unit, hole_id, interval_length, raw_text_snippet)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (project_id, "TPM Grade", float(tpm), "g/t", hole_id, float(interval), f"Hole {hole_id}: {tpm} g/t TPM over {interval}m"))

    conn.commit()
    print("Ingestion Complete.")

if __name__ == "__main__":
    if not os.path.exists("../database"):
        os.makedirs("../database")
        
    conn = init_db()
    ingest_magna_data(conn)
    conn.close()
