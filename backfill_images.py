"""
Backfill missing article images by scraping Open Graph meta tags from URLs.
"""
import sqlite3
import requests
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_PATH = "database/mining.db"

def extract_og_image(url: str) -> str:
    """Extract Open Graph image from a URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        response.raise_for_status()
        
        html = response.text
        
        # Try og:image first (most reliable)
        og_match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not og_match:
            og_match = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.IGNORECASE)
        
        if og_match:
            return og_match.group(1)
        
        # Try twitter:image
        tw_match = re.search(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not tw_match:
            tw_match = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']', html, re.IGNORECASE)
        
        if tw_match:
            return tw_match.group(1)
        
        # Try first large image in article
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*(?:width|height)=["\']?(\d+)', html, re.IGNORECASE)
        if img_match:
            size = int(img_match.group(2))
            if size > 200:  # Avoid tiny icons
                return img_match.group(1)
        
        return ""
        
    except Exception as e:
        logging.debug(f"Failed to fetch {url}: {e}")
        return ""


def backfill_images(max_articles: int = 100):
    """Backfill missing images in the news database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get articles without images
    cursor.execute("""
        SELECT id, title, url FROM news 
        WHERE (image_url IS NULL OR image_url = '') 
        AND url IS NOT NULL AND url != ''
        LIMIT ?
    """, (max_articles,))
    
    articles = cursor.fetchall()
    logging.info(f"Found {len(articles)} articles missing images")
    
    if not articles:
        conn.close()
        return
    
    updated = 0
    failed = 0
    
    def process_article(article):
        article_id = article['id']
        url = article['url']
        title = article['title'][:50]
        
        image_url = extract_og_image(url)
        return (article_id, title, image_url)
    
    # Process in parallel for speed
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_article, article): article for article in articles}
        
        for future in as_completed(futures):
            try:
                article_id, title, image_url = future.result()
                
                if image_url:
                    cursor.execute("UPDATE news SET image_url = ? WHERE id = ?", (image_url, article_id))
                    updated += 1
                    logging.info(f"✓ Updated: {title}...")
                else:
                    failed += 1
                    logging.debug(f"✗ No image: {title}...")
                    
            except Exception as e:
                failed += 1
                logging.error(f"Error processing article: {e}")
    
    conn.commit()
    conn.close()
    
    logging.info(f"\n=== Summary ===")
    logging.info(f"Updated: {updated}")
    logging.info(f"No image found: {failed}")
    logging.info(f"Total processed: {len(articles)}")


if __name__ == "__main__":
    backfill_images(100)
