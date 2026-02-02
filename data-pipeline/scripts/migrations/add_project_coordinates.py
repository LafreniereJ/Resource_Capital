"""
Add coordinates for Agnico Eagle projects using db_manager.
"""
import os
import sys

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from processing.db_manager import get_connection

# Coordinates from web search - Agnico Eagle projects
COORDS = {
    "Detour": (50.019, -79.717),
    "Meadowbank": (65.021, -96.071),
    "Meliadine": (63.040, -92.229),
    "Macassa": (48.139, -80.073),
    "Canadian Malartic": (48.112, -78.132),
    "Malartic": (48.112, -78.132),
    "LaRonde": (48.248, -78.442),
    "Goldex": (48.190, -78.117),
    "Kittila": (67.908, 25.400),
    "Fosterville": (-36.700, 144.283),
    "Pinos Altos": (28.067, -108.233),
    "La India": (29.033, -108.600),
    "Odyssey": (48.110, -78.130),
    "Hope Bay": (68.150, -106.550),
    "Amaruq": (65.300, -96.400),
}

def main():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get AEM company ID
    cursor.execute("SELECT id, name FROM companies WHERE ticker='AEM'")
    row = cursor.fetchone()
    if not row:
        print("AEM not found in database")
        conn.close()
        return
    
    company_id = row['id']
    print(f"Found: {row['name']} (ID: {company_id})")
    
    # Get all AEM projects
    cursor.execute("SELECT id, name, latitude, longitude FROM projects WHERE company_id=?", (company_id,))
    projects = cursor.fetchall()
    print(f"\n{len(projects)} projects found\n")
    
    updated = 0
    for project in projects:
        pid = project['id']
        name = project['name']
        has_coords = project['latitude'] is not None
        
        # Try to match
        for key, (lat, lon) in COORDS.items():
            if key.lower() in name.lower():
                cursor.execute(
                    "UPDATE projects SET latitude=?, longitude=? WHERE id=?",
                    (lat, lon, pid)
                )
                status = "updated" if not has_coords else "refreshed"
                print(f"✓ {name}: ({lat}, {lon}) - {status}")
                updated += 1
                break
        else:
            if has_coords:
                print(f"• {name}: already has coords")
            else:
                print(f"✗ {name}: no match found")
    
    conn.commit()
    conn.close()
    print(f"\n✅ Updated {updated} projects with coordinates")

if __name__ == "__main__":
    main()
