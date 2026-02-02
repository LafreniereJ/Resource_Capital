# Data Sources Reference

Quick reference for all data sources used by the Resource Capital data pipeline.

---

## News & Press Releases

### Primary Sources (Highest Priority)

| Source | URL | Category | Notes |
|--------|-----|----------|-------|
| TMX Newsfile Mining | https://feeds.newsfilecorp.com/industry/mining-metals | Press Releases | Official TSX/TSXV mining announcements |

### Mining Industry News

| Source | URL | Category |
|--------|-----|----------|
| Mining.com (All) | https://www.mining.com/feed/ | General Mining |
| Mining.com Gold | https://www.mining.com/commodity/gold/feed/ | Gold |
| Mining.com Copper | https://www.mining.com/commodity/copper/feed/ | Copper |
| Mining.com Lithium | https://www.mining.com/commodity/lithium/feed/ | Lithium |
| Mining.com Nickel | https://www.mining.com/commodity/nickel/feed/ | Nickel |
| Mining.com Uranium | https://www.mining.com/commodity/uranium/feed/ | Uranium |
| Mining.com Silver | https://www.mining.com/commodity/silver/feed/ | Silver |
| Northern Miner | https://www.northernminer.com/feed/ | Canadian Mining |
| Mining Weekly | https://www.miningweekly.com/rss | Global Mining |
| Junior Mining Network | https://www.juniorminingnetwork.com/feed.rss | Juniors/Explorers |
| IGF Mining | https://www.igfmining.org/blog/feed/ | Policy/Sustainability |
| Financial Post Mining | https://financialpost.com/category/commodities/mining/feed.xml | Canadian Business |
| Canadian Mining Journal | https://www.canadianminingjournal.com/feed/ | Canadian Mining |
| Canadian Mining Magazine | https://canadianminingmagazine.com/feed/ | Canadian Mining |

### Commodities & Metals

| Source | URL | Category |
|--------|-----|----------|
| FT Precious Metals | https://www.ft.com/precious-metals?format=rss | Precious Metals |
| Investing.com Commodities | https://www.investing.com/rss/news_301.rss | Commodities |
| Kitco Gold News | https://www.kitco.com/rss/gold.xml | Precious Metals |
| Resource World | https://resourceworld.com/feed/ | Mining News |

---

## Market Data

### Stock Prices & Financials

| Source | API/Method | Data |
|--------|------------|------|
| Yahoo Finance (yfinance) | Python library | Prices, Financials, Market Cap |
| Finnhub | REST API | Market News, Company News |
| NewsAPI | REST API | General Financial News |

### Ticker Formats

| Exchange | yfinance Format | Example |
|----------|-----------------|---------|
| TSX | `TICKER.TO` | `AEM.TO` |
| TSXV | `TICKER.V` | `NICU.V` |
| NYSE/NASDAQ | `TICKER` | `NEM` |

---

## Regulatory Filings

### SEDAR+ (Canadian)

| Resource | URL | Notes |
|----------|-----|-------|
| SEDAR+ Portal | https://www.sedarplus.ca | NI 43-101, MD&A, Financial Statements |
| RSS Feed Template | `https://www.sedarplus.ca/csa-party/records/rss.xml?companyProfileId={ID}` | Per-company feed (requires profile ID) |

**Note:** SEDAR+ has CAPTCHA protection. Use `sedar_selenium.py` for automated access.

---

## Company Lists

### Official TSX/TSXV Mining Companies

| Source | File | Notes |
|--------|------|-------|
| TMX Group | `seed_data/TMX_Mining_Companies.xlsx` | Monthly export from TMX |
| Tracked Companies | `seed_data/official_tracked_companies.csv` | Our 203 tracked companies |

---

## API Keys Required

Store in `.env` file:

```env
FINNHUB_API_KEY=your_key_here     # https://finnhub.io (free tier: 60 calls/min)
NEWSAPI_KEY=your_key_here         # https://newsapi.org (free tier: 100 req/day)
GROQ_API_KEY=your_key_here        # https://groq.com (for LLM extraction)
```

---

## Metal Prices

Fetched via yfinance using commodity symbols:

| Metal | Symbol | Notes |
|-------|--------|-------|
| Gold | GC=F | COMEX Gold Futures |
| Silver | SI=F | COMEX Silver Futures |
| Copper | HG=F | COMEX Copper Futures |
| Platinum | PL=F | NYMEX Platinum Futures |
| Palladium | PA=F | NYMEX Palladium Futures |
| Uranium | UX=F | Uranium Futures |

---

## File Locations

| Data Type | Location |
|-----------|----------|
| SQLite Database | `../database/mining.db` |
| Downloaded PDFs | `../downloads/` |
| SEDAR Filings | `../downloads/sedar/` |
| Logs | `logs/` |

---

## Update Schedule (Cron)

| Task | Frequency | Script |
|------|-----------|--------|
| News Fetch | Every 15 min | `fetch_news.py` |
| Extraction Trigger | Every 30 min | `extraction_trigger.py` |
| Extraction Worker | Every hour | `run_extraction.py` |
| Market Data | Daily | `populate_historical.py --market` |
| Historical Backfill | Daily 2am | `run_extraction.py --backfill` |

---

*Last updated: January 2025*
