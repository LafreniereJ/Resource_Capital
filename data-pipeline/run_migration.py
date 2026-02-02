
import os
import sys

# Add current directory to path so we can import processing
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from processing.db_manager import get_connection, logger

def run_migration():
    migration_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "migrations", "05_monetization.sql")
    
    print(f"Reading migration file: {migration_file}")
    
    with open(migration_file, "r") as f:
        sql = f.read()

    print("Connecting to database...")
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                print("Executing SQL...")
                cursor.execute(sql)
                print("Migration executed successfully.")
    except Exception as e:
        print(f"Error executing migration: {e}")

if __name__ == "__main__":
    run_migration()
