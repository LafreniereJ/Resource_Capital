# Architecture Decisions - Resource Capital

> **Purpose**: Document key architectural choices and their rationale.
> **Status**: Approved (Phase 0)
> **Last Updated**: 2026-01-20

---

## ADR-001: Background Job Runner

### Context
The platform requires scheduled background jobs for:
- Stock price updates (every 15 min)
- Metal price updates (every 15 min)
- News fetching (every 15 min)
- Data extraction (hourly)
- Daily maintenance tasks

### Options Evaluated

| Option | Pros | Cons |
|--------|------|------|
| **Supabase Cron (pg_cron)** | Native to stack, no extra infra | Limited to SQL/Edge Functions, no Python |
| **Vercel Cron** | Serverless, auto-scaling, free tier | 1 min minimum interval, cold starts |
| **QStash (Upstash)** | Serverless, reliable, webhooks | Additional cost, external dependency |
| **Celery + Redis** | Powerful, Python native | Heavy infra, overkill for current needs |
| **Railway/Render Background Worker** | Simple Python process | Monthly cost (~$5-10), single process |
| **Current: run_scheduler.py** | Works now, simple | Requires always-on machine, manual restarts |

### Decision: **Vercel Cron + Supabase Edge Functions**

**Primary**: Vercel Cron triggers Next.js API routes or Supabase Edge Functions
**Fallback**: QStash for critical jobs requiring guaranteed delivery

### Rationale
1. **Serverless-first**: Aligns with Vercel deployment, no always-on servers needed
2. **Cost-effective**: Vercel Cron is free (up to 2 cron jobs on Hobby, more on Pro)
3. **Simple migration**: Current Python scripts can be wrapped as API endpoints
4. **Supabase integration**: Edge Functions can directly access database

### Implementation Plan

```
┌─────────────────┐
│  Vercel Cron    │ (triggers every 15 min)
└────────┬────────┘
         │
         ▼
┌─────────────────┐         ┌─────────────────┐
│ /api/cron/      │ ───────>│ Supabase Edge   │
│ prices          │         │ Functions       │
│ news            │         │ (optional)      │
│ maintenance     │         └─────────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Supabase DB   │
└─────────────────┘
```

### Vercel Cron Configuration (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/prices",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/news",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/daily",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Migration Steps
1. Create `/api/cron/prices` endpoint (wraps yfinance logic)
2. Create `/api/cron/news` endpoint (wraps RSS fetcher)
3. Add cron authentication (CRON_SECRET env var)
4. Test in preview deployments
5. Enable in production

### Security
- Cron endpoints protected by `CRON_SECRET` header
- Only Vercel can trigger these endpoints
- Rate limiting on public endpoints

---

## ADR-002: Cache Layer

### Context
High-read data (metal prices, company metadata) should be cached to:
- Reduce database load
- Improve response times
- Handle traffic spikes

### Decision: **Vercel Edge Config + Supabase Realtime (optional)**

**Short-term**: Use Next.js built-in caching (`revalidate` in fetch)
**Medium-term**: Add Vercel Edge Config for metal prices
**Long-term**: Consider Upstash Redis if needed

### Rationale
1. **Simplicity**: Next.js ISR caching handles most cases
2. **No extra infra**: Edge Config is included with Vercel
3. **Cost**: Redis adds complexity and cost prematurely

### Implementation

```typescript
// Next.js ISR caching (current)
export const revalidate = 60; // Revalidate every 60 seconds

// Vercel Edge Config (future)
import { get } from '@vercel/edge-config';
const metalPrices = await get('metal_prices');
```

### Cache TTLs

| Data Type | Cache TTL | Strategy |
|-----------|-----------|----------|
| Metal prices | 60s | ISR with on-demand revalidation |
| Stock prices | 60s | ISR with on-demand revalidation |
| Company metadata | 1 hour | ISR |
| News list | 5 min | ISR |
| Static pages | 1 day | ISR |

---

## ADR-003: Pricing Data Source Hierarchy

### Context
Stock and metal prices come from various sources with different reliability and cost.

### Decision: **yfinance (Primary) → Manual Fallback**

**Primary**: yfinance (free, reliable, 15-min delayed)
**Fallback**: Display cached data with "stale" indicator
**Future**: Consider Alpha Vantage or Polygon.io for real-time

### Source Priority

| Priority | Source | Cost | Latency | Coverage |
|----------|--------|------|---------|----------|
| 1 | yfinance | Free | 15-min delay | TSX/TSXV + Commodities |
| 2 | Cached data | Free | Instant | All |
| 3 | Alpha Vantage | $50/mo | Near real-time | US + TSX |
| 4 | Polygon.io | $99/mo | Real-time | US + CAD |

### Error Handling

```python
def get_stock_price(ticker: str) -> Optional[float]:
    # Try primary source
    price = yfinance_fetch(ticker)
    if price:
        cache.set(ticker, price, ttl=1800)
        return price

    # Fallback to cache
    cached = cache.get(ticker)
    if cached:
        log.warning(f"Using cached price for {ticker}")
        return cached

    # No data available
    log.error(f"No price data for {ticker}")
    return None
```

---

## Summary

| Decision | Choice | Status |
|----------|--------|--------|
| Background Jobs | Vercel Cron + API Routes | Approved |
| Cache Layer | Next.js ISR + Edge Config | Approved |
| Price Data Source | yfinance → Cached Fallback | Approved |

---

## Changelog

| Date | Decision | Change |
|------|----------|--------|
| 2026-01-20 | ADR-001 | Initial - Vercel Cron chosen |
| 2026-01-20 | ADR-002 | Initial - Next.js ISR caching |
| 2026-01-20 | ADR-003 | Initial - yfinance primary |
