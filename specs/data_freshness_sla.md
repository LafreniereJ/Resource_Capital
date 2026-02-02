# Data Freshness SLAs - Resource Capital

> **Purpose**: Defines refresh intervals and staleness thresholds for all data types.
> **Status**: Approved (Phase 0)
> **Last Updated**: 2026-01-20

---

## Overview

Data freshness directly impacts user trust and platform value. This document defines:
- **Update Frequency**: How often we fetch/refresh data
- **Staleness Threshold**: When data is considered "stale" and flagged in UI
- **Source**: Primary and fallback data sources
- **Tier Access**: Which subscription tiers get which freshness level

---

## Data Freshness Matrix

| Data Type | Free Tier | Pro Tier | Institutional | Update Frequency | Staleness Threshold |
|-----------|-----------|----------|---------------|------------------|---------------------|
| Stock Prices | 15-min delayed | Real-time* | Real-time* | 15 minutes | 30 minutes |
| Metal Prices | 15-min delayed | Real-time* | Real-time* | 15 minutes | 30 minutes |
| News | Immediate | Immediate | Immediate | 15 minutes | 1 hour |
| Company Metadata | Same-day | Same-day | Same-day | Daily | 7 days |
| Financials | Same-day | Same-day | Same-day | Quarterly | 1 quarter |
| Insider Transactions | Same-day | Same-day | Same-day | Daily | 7 days |
| Project Data | Same-day | Same-day | Same-day | On-demand | 30 days |
| Reserves/Resources | Same-day | Same-day | Same-day | On report release | 1 year |

*Note: "Real-time" means ~15-minute updates from yfinance. True real-time requires premium data feeds.

---

## Detailed SLAs by Data Type

### 1. Stock Prices (companies.current_price)

| Attribute | Value |
|-----------|-------|
| **Source** | yfinance (primary) |
| **Fallback** | None (display stale warning) |
| **Update Frequency** | Every 15 minutes during market hours |
| **Market Hours** | TSX: 9:30 AM - 4:00 PM ET, Mon-Fri |
| **Staleness Threshold** | 30 minutes |
| **UI Indicator** | Show `last_updated` timestamp; yellow warning if stale |

**Implementation Notes**:
- `fetch_stock_prices.py` runs via scheduler
- Updates `companies.current_price`, `day_change`, `day_change_percent`
- Also updates `price_history` table for historical data

---

### 2. Metal/Commodity Prices (metal_prices)

| Attribute | Value |
|-----------|-------|
| **Source** | yfinance futures (primary) |
| **Fallback** | Previous close (cached) |
| **Update Frequency** | Every 15 minutes |
| **Trading Hours** | Varies by commodity (futures trade ~23 hours) |
| **Staleness Threshold** | 30 minutes |
| **UI Indicator** | Ticker shows `fetched_at`; dim if stale |

**Supported Commodities**:
| Commodity | Symbol | Market |
|-----------|--------|--------|
| Gold | GC=F | COMEX |
| Silver | SI=F | COMEX |
| Copper | HG=F | COMEX |
| Platinum | PL=F | NYMEX |
| Palladium | PA=F | NYMEX |
| Nickel | NI=F | LME |
| Uranium | URA | ETF Proxy |

---

### 3. News Articles (news)

| Attribute | Value |
|-----------|-------|
| **Sources** | TMX Newsfile, Mining.com, Kitco, Junior Mining Network |
| **Fallback** | Cached articles |
| **Update Frequency** | Every 15 minutes |
| **Staleness Threshold** | 1 hour (for "latest" badge) |
| **Retention** | 90 days in primary table; archived after |
| **UI Indicator** | "X minutes ago" timestamp; "NEW" badge for <1 hour |

**Feed Priority**:
1. TMX Newsfile (official press releases) - highest priority
2. Mining.com (industry news)
3. Kitco News (metals focus)
4. Junior Mining Network (TSXV focus)

---

### 4. Company Metadata (companies.*)

| Attribute | Value |
|-----------|-------|
| **Source** | yfinance (company info) + manual enrichment |
| **Update Frequency** | Daily (overnight batch) |
| **Staleness Threshold** | 7 days |
| **Fields Updated** | description, website, market_cap, 52w high/low, avg_volume |

**Manual Enrichment**:
- New company additions require manual ticker verification
- Commodity classification is manual
- Website URLs verified quarterly

---

### 5. Financial Statements (financials)

| Attribute | Value |
|-----------|-------|
| **Source** | yfinance (quarterly/annual reports) |
| **Update Frequency** | On earnings release (quarterly) |
| **Staleness Threshold** | 1 quarter after period_end |
| **Types** | Income, Balance Sheet, Cash Flow |
| **UI Indicator** | Show `period_end` date; flag if >1 quarter old |

---

### 6. Insider Transactions (insider_transactions)

| Attribute | Value |
|-----------|-------|
| **Source** | SEDI filings (via scraping or API) |
| **Update Frequency** | Daily |
| **Staleness Threshold** | 7 days |
| **Retention** | 2 years |

---

### 7. Project Data (projects)

| Attribute | Value |
|-----------|-------|
| **Source** | Manual entry + technical report extraction |
| **Update Frequency** | On-demand (when reports released) |
| **Staleness Threshold** | 30 days for active projects |
| **Fields** | name, location, stage, commodity, ownership_percentage |

---

### 8. Reserves & Resources (reserves_resources)

| Attribute | Value |
|-----------|-------|
| **Source** | NI 43-101 Technical Reports |
| **Update Frequency** | On report release (typically annual) |
| **Staleness Threshold** | 1 year from report_date |
| **UI Indicator** | Show report date prominently; flag if >1 year old |

---

## Staleness Handling

### UI Indicators

| Status | Visual Treatment |
|--------|-----------------|
| **Fresh** | Normal display, green timestamp |
| **Warning** | Yellow/amber timestamp, "(delayed)" label |
| **Stale** | Red timestamp, "Data may be outdated" banner |
| **Error** | Gray out data, show "Unable to fetch" message |

### API Response Headers

All API responses include freshness metadata:

```json
{
  "data": { ... },
  "meta": {
    "fetched_at": "2026-01-20T14:30:00Z",
    "freshness": "fresh|warning|stale",
    "next_update": "2026-01-20T14:45:00Z",
    "source": "yfinance"
  }
}
```

---

## Monitoring & Alerting

### Health Checks

| Check | Frequency | Alert Threshold |
|-------|-----------|-----------------|
| Stock price job | Every 15 min | >30 min since last success |
| Metal price job | Every 15 min | >30 min since last success |
| News fetch job | Every 15 min | >1 hour since last success |
| DB connection | Every 1 min | Any failure |

### Metrics to Track

- `data_fetch_success_rate` - % successful fetches per job
- `data_fetch_latency_ms` - Time to complete fetch
- `data_staleness_count` - Number of stale records by type
- `api_response_freshness` - Distribution of fresh/warning/stale responses

---

## Scheduler Configuration

Current scheduler (`run_scheduler.py`) intervals:

```python
SCHEDULE = {
    "fetch_stock_prices": "*/15 * * * *",   # Every 15 minutes
    "fetch_metal_prices": "*/15 * * * *",   # Every 15 minutes
    "fetch_news": "*/15 * * * *",           # Every 15 minutes
    "update_company_metadata": "0 2 * * *", # Daily at 2 AM
}
```

Market-aware scheduling:
- Stock prices only fetched during TSX market hours (9:30 AM - 4:00 PM ET)
- Weekend fetches reduced to every 2 hours (for metals that trade)

---

## Implementation Checklist

- [x] Stock price fetcher with 15-min interval
- [x] Metal price fetcher with 15-min interval
- [x] News fetcher with 15-min interval
- [ ] Add `fetched_at` to all API responses
- [ ] Add staleness indicators in frontend
- [ ] Add health check endpoint (`/api/health`)
- [ ] Configure alerting for stale data
- [ ] Add market-hours awareness to scheduler

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-20 | Initial specification | Ralph |
