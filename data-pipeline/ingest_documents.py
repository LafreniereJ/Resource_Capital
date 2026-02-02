import os
import shutil
import sys
import json
from datetime import datetime
from dotenv import load_dotenv

# Add module path
sys.path.append(os.path.join(os.path.dirname(__file__), 'ingestion'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'processing'))

try:
    from pdf_extractor import PDFExtractor
    import db_manager as db
except ImportError:
    # Fallback for running from root
    sys.path.append(os.path.abspath("data-pipeline/ingestion"))
    sys.path.append(os.path.abspath("data-pipeline/processing"))
    from pdf_extractor import PDFExtractor
    import db_manager as db

# Configuration
INCOMING_QUARTERLY = os.path.join("data-pipeline", "documents", "incoming", "quarterly")
INCOMING_TECHNICAL = os.path.join("data-pipeline", "documents", "incoming", "technical")
ARCHIVE_QUARTERLY = os.path.join("data-pipeline", "documents", "archive", "quarterly")
ARCHIVE_TECHNICAL = os.path.join("data-pipeline", "documents", "archive", "technical")

def process_quarterly_reports(extractor):
    """Process quarterly/annual reports for production data."""
    if not os.path.exists(INCOMING_QUARTERLY):
        return
    
    files = [f for f in os.listdir(INCOMING_QUARTERLY) if f.lower().endswith('.pdf')]
    if not files:
        return
    
    print(f"\n{'='*60}")
    print(f"PROCESSING QUARTERLY REPORTS ({len(files)} files)")
    print(f"{'='*60}")
    
    for filename in files:
        file_path = os.path.join(INCOMING_QUARTERLY, filename)
        print(f"\nProcessing: {filename}...")
        
        try:
            # Extract production data
            production_data = extractor.extract_production_data(file_path)
            
            if production_data:
                print(f"Extracted {len(production_data)} production records.")
                
                # Parse Ticker from filename
                parts = filename.split('_')
                ticker = parts[0] if len(parts) > 1 else "UNKNOWN"
                
                # Look up company ID
                conn = db.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM companies WHERE ticker = ?", (ticker.upper(),))
                res = cursor.fetchone()
                company_id = res['id'] if res else None
                conn.close()
                
                if not company_id:
                    print(f"Warning: Ticker {ticker} not found in DB. Skipping insertion.")
                    continue
                
                # Insert production records
                for record in production_data:
                    db.insert_earnings(
                        company_id=company_id,
                        ticker=ticker,
                        period=record.get('period', 'Unknown'),
                        mine_name=record.get('mine_name', 'Corporate'),
                        gold_oz=record.get('gold_oz'),
                        silver_oz=record.get('silver_oz'),
                        copper_lbs=record.get('copper_lbs'),
                        gold_equivalent_oz=record.get('gold_equivalent_oz'),
                        ore_processed_tonnes=record.get('ore_processed_tonnes'),
                        head_grade=record.get('head_grade'),
                        recovery_rate=record.get('recovery_rate'),
                        aisc_per_oz=record.get('aisc_per_oz'),
                        cash_cost_per_oz=record.get('cash_cost_per_oz'),
                        extraction_method="LLM",
                        confidence=0.85
                    )
                
                print("Data saved to earnings table.")
            else:
                print("No production data extracted.")
            
            # Archive file
            os.makedirs(ARCHIVE_QUARTERLY, exist_ok=True)
            dest_path = os.path.join(ARCHIVE_QUARTERLY, filename)
            shutil.move(file_path, dest_path)
            print(f"Archived to: {dest_path}")
            
        except Exception as e:
            print(f"Failed to process {filename}: {e}")

def process_technical_reports(extractor):
    """Process NI 43-101 technical reports for mineral resources."""
    if not os.path.exists(INCOMING_TECHNICAL):
        return
    
    files = [f for f in os.listdir(INCOMING_TECHNICAL) if f.lower().endswith('.pdf')]
    if not files:
        return
    
    print(f"\n{'='*60}")
    print(f"PROCESSING TECHNICAL REPORTS ({len(files)} files)")
    print(f"{'='*60}")
    
    for filename in files:
        file_path = os.path.join(INCOMING_TECHNICAL, filename)
        print(f"\nProcessing: {filename}...")
        
        try:
            # Extract mineral inventory
            estimates = extractor.extract_mineral_inventory(file_path)
            
            if estimates:
                print(f"Extracted {len(estimates)} rows of data.")
                
                # Parse Ticker from filename
                parts = filename.split('_')
                ticker = parts[0] if len(parts) > 1 else "UNKNOWN"
                
                # Look up company ID
                conn = db.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM companies WHERE ticker = ?", (ticker.upper(),))
                res = cursor.fetchone()
                company_id = res['id'] if res else None
                conn.close()
                
                if not company_id:
                    print(f"Warning: Ticker {ticker} not found in DB. Data will be orphaned.")

                # Insert Report Record
                report_id = db.insert_technical_report(
                    company_id=company_id if company_id else 0,
                    ticker=ticker,
                    report_type="Technical Report",
                    effective_date=datetime.now().strftime("%Y-%m-%d"), 
                    local_path=os.path.join(ARCHIVE_TECHNICAL, filename),
                    source="Manual Upload"
                )
                
                # Insert Estimates
                for est in estimates:
                    db.insert_mineral_estimate(
                        report_id=report_id,
                        company_id=company_id if company_id else 0,
                        project_name="Unknown Project",
                        category=est.get('category', 'Unknown'),
                        commodity=est.get('commodity', 'Unknown'),
                        tonnage_mt=est.get('tonnage_mt'),
                        grade=est.get('grade'),
                        grade_unit=est.get('grade_unit'),
                        contained_metal=est.get('contained_metal'),
                        contained_unit=est.get('contained_metal_unit')
                    )
                
                print("Data saved to Database.")
                
            else:
                print("LLM found no structured data.")
            
            # Archive file
            os.makedirs(ARCHIVE_TECHNICAL, exist_ok=True)
            dest_path = os.path.join(ARCHIVE_TECHNICAL, filename)
            shutil.move(file_path, dest_path)
            print(f"Archived to: {dest_path}")
            
        except Exception as e:
            print(f"Failed to process {filename}: {e}")

def process_documents():
    load_dotenv()
    
    # Ensure dirs exist
    os.makedirs(INCOMING_QUARTERLY, exist_ok=True)
    os.makedirs(INCOMING_TECHNICAL, exist_ok=True)
    
    extractor = PDFExtractor()
    
    # Process both types
    process_quarterly_reports(extractor)
    process_technical_reports(extractor)
    
    print(f"\n{'='*60}")
    print("PROCESSING COMPLETE")
    print(f"{'='*60}")

if __name__ == "__main__":
    process_documents()
