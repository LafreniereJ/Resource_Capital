# Resource Capital - Project Requirements

## Overview
Institutional-grade mining intelligence platform for TSX/TSXV companies.

## Target Users
- Retail investors interested in mining stocks
- Institutional investors and analysts
- Mining industry professionals

## Core Features

### 1. Market Data Dashboard
- Real-time stock prices for 200+ TSX/TSXV mining companies
- Metal commodity prices (Gold, Silver, Copper, Platinum, Palladium, Nickel, Uranium)
- Daily % change tracking
- 52-week high/low indicators
- Market cap rankings

### 2. Company Profiles
- Detailed company information
- Project locations with interactive map
- Financial statements (income, balance, cash flow)
- Historical price charts
- Insider transaction tracking
- Technical reports and mineral estimates

### 3. News Aggregation
- Mining-focused news from multiple sources
- Company-specific news filtering
- Press release highlighting
- Search functionality

### 4. Stock Screener
- Filter by commodity, exchange, market cap
- Sort by various metrics
- Pagination for large datasets
- Export capabilities (future)

### 5. Research Reports
- Upload and store custom research reports
- Link reports to specific companies
- PDF viewing (future)

## Technical Requirements

### Performance
- Page load < 2 seconds
- API response < 200ms
- Support 100+ concurrent users

### Reliability
- 99.9% uptime target
- Data freshness < 15 minutes for prices
- Automated error recovery

### Security
- User authentication required for premium features
- API rate limiting
- Input validation and sanitization

### Data Quality
- Licensed data sources (no scraping)
- Audit trail for data updates
- Data validation on ingestion

## Subscription Tiers

### Free Tier
- Delayed stock data (15-min)
- Basic company profiles
- Limited news access
- No API access

### Professional ($49/mo)
- Real-time stock data
- Full company profiles
- Unlimited news
- Basic API access (1000 calls/day)
- Portfolio tracking
- Email alerts

### Institutional ($299/mo)
- Everything in Professional
- Bulk data exports
- Advanced API (10000 calls/day)
- Custom alerts
- Priority support
- Historical data access

## Pages Required

| Page | Route | Status |
|------|-------|--------|
| Landing | / | ✅ Done |
| Stocks | /stocks | ✅ Done |
| News | /news | ✅ Done |
| Companies | /companies | ✅ Done |
| Company Detail | /companies/[ticker] | ✅ Done |
| Project Detail | /companies/[ticker]/projects/[id] | ✅ Done |
| Map | /map | ✅ Done |
| Compare | /compare | ✅ Done |
| Transactions | /transactions | ✅ Done |
| Reports | /reports | ✅ Done |
| Report Detail | /reports/[id] | ✅ Done |
| Login | /login | ❌ Needed |
| Register | /register | ❌ Needed |
| Profile | /profile | ❌ Needed |
| Billing | /billing | ❌ Needed |

## API Endpoints Required

### Public
- GET /api/companies - List companies
- GET /api/companies/{ticker} - Company detail
- GET /api/metals - Metal prices
- GET /api/news - News feed
- GET /api/search - Global search

### Authenticated
- GET /api/user/profile - User profile
- GET /api/user/watchlist - User watchlist
- POST /api/user/watchlist - Add to watchlist
- DELETE /api/user/watchlist/{ticker} - Remove from watchlist

### Premium
- GET /api/export/companies - Bulk export
- GET /api/historical/{ticker} - Historical data
- POST /api/alerts - Create alert
