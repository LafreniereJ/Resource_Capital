import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data-pipeline/database/mining.db")
MIGRATION_FILE = os.path.join(os.path.dirname(__file__), "data-pipeline/database/migrations/01_critical_items.sql")

def apply_migrations():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    if not os.path.exists(MIGRATION_FILE):
        print(f"Error: Migration file not found at {MIGRATION_FILE}")
        return

    print(f"Applying migration: {os.path.basename(MIGRATION_FILE)}")
    
    with open(MIGRATION_FILE, 'r') as f:
        sql = f.read()
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.executescript(sql)
        conn.commit()
        print("Migration applied successfully.")
        
        # Verify tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print("Current Tables:", tables)
        
    except Exception as e:
        print(f"Migration failed: {e}")
        
    conn.close()

if __name__ == "__main__":
    apply_migrations()
