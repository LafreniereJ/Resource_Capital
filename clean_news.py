"""
Clean non-mining articles from the news database.
Removes articles that don't contain mining/metals/Canadian economic keywords.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'mining.db')

# Mining/metals/economic keywords that MUST be present
REQUIRED_KEYWORDS = [
    'mining', 'miner', 'mine', 'gold', 'copper', 'lithium', 'silver', 'nickel', 
    'uranium', 'zinc', 'iron ore', 'exploration', 'drill', 'deposit', 'ore',
    'tsx', 'tsxv', 'production', 'ounces', 'reserves', 'aisc', 'mineral',
    'metals', 'commodity', 'smelter', 'refinery', 'barrick', 'newmont', 'agnico',
    'teck', 'vale', 'economic', 'inflation', 'interest rate', 'bank of canada'
]

# Terms that indicate NON-mining content (auto-exclude)
EXCLUDE_KEYWORDS = [
    'crypto', 'bitcoin', 'nft', 'blockchain', 'metaverse', 'gaming',
    'software', 'tech startup', 'app', 'streaming', 'social media',
    'fashion', 'entertainment', 'celebrity', 'sports', 'movie', 'music'
]

def clean_news_database():
    """Remove non-mining articles from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all news articles
    cursor.execute("SELECT id, title, description FROM news")
    articles = cursor.fetchall()
    
    print(f"Found {len(articles)} total articles in database")
    
    to_delete = []
    
    for article_id, title, description in articles:
        text = (title + ' ' + (description or '')).lower()
        
        # Check for exclude terms first
        if any(term in text for term in EXCLUDE_KEYWORDS):
            to_delete.append(article_id)
            print(f"  Excluding (non-mining): {title[:60]}...")
            continue
        
        # Check if it contains at least 2 required keywords
        matches = sum(1 for keyword in REQUIRED_KEYWORDS if keyword in text)
        if matches < 2:
            to_delete.append(article_id)
            print(f"  Excluding (insufficient keywords): {title[:60]}...")
    
    # Delete non-mining articles
    if to_delete:
        placeholders = ','.join('?' * len(to_delete))
        cursor.execute(f"DELETE FROM news WHERE id IN ({placeholders})", to_delete)
        conn.commit()
        print(f"\n✓ Removed {len(to_delete)} non-mining articles")
        print(f"✓ Kept {len(articles) - len(to_delete)} mining/metals/economic articles")
    else:
        print("\n✓ All articles are mining-related. No cleanup needed.")
    
    conn.close()

if __name__ == "__main__":
    clean_news_database()
