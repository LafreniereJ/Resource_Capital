# Resource Capital - Canonical Entity Definitions

> Phase 0 Architecture Decision: Defines the core data entities for the platform.

## Overview

Resource Capital tracks mining companies, their projects, market data, news, and user subscriptions. This document defines the canonical structure for each entity.

---

## Core Entities

### 1. Company

The primary entity representing a TSX/TSXV mining company.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `ticker` | string | Yes | Unique stock symbol (e.g., "AEM", "NEM") |
| `name` | string | Yes | Company legal name |
| `exchange` | string | Yes | Exchange code: "TSX" or "TSXV" |
| `commodity` | string | No | Primary commodity (Gold, Silver, Copper, etc.) |
| `description` | text | No | Company description |
| `website` | string | No | Company website URL |
| `currency` | string | Yes | Trading currency (default: "CAD") |

**Market Data Fields** (updated every 15 minutes):
| Field | Type | Description |
|-------|------|-------------|
| `current_price` | decimal | Latest stock price |
| `prev_close` | decimal | Previous trading day close |
| `day_change` | decimal | Price change from prev_close |
| `day_change_percent` | decimal | Percentage change |
| `day_open` | decimal | Opening price |
| `day_high` | decimal | Day's high |
| `day_low` | decimal | Day's low |
| `day_volume` | bigint | Trading volume |
| `market_cap` | decimal | Market capitalization |
| `high_52w` | decimal | 52-week high |
| `low_52w` | decimal | 52-week low |
| `avg_volume` | bigint | Average volume |
| `last_updated` | timestamp | When market data was last refreshed |

**Relationships**:
- Has many: Projects, News, Filings, Earnings, TechnicalReports

---

### 2. Project

A mining project owned by a company.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `company_id` | integer | Yes | FK to companies |
| `name` | string | Yes | Project name |
| `location` | string | No | Geographic location |
| `latitude` | decimal | No | GPS latitude |
| `longitude` | decimal | No | GPS longitude |
| `stage` | string | No | Development stage (Exploration, Development, Production) |
| `commodity` | string | No | Primary commodity at this project |
| `ownership_percentage` | decimal | No | Ownership stake (0-100) |

**Relationships**:
- Belongs to: Company
- Has many: ReservesResources, MineProduction, ProjectEconomics

---

### 3. News

News articles and press releases about mining companies.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `external_id` | string | No | ID from source (for deduplication) |
| `title` | string | Yes | Article title |
| `description` | text | No | Article summary/excerpt |
| `url` | string | Yes | Link to full article |
| `source` | string | No | News source (TMX Newsfile, Mining.com, etc.) |
| `published_at` | timestamp | No | Publication date |
| `company_id` | integer | No | FK to companies (if company-specific) |
| `ticker` | string | No | Associated ticker symbol |
| `category` | string | No | News category |
| `is_press_release` | boolean | No | Whether this is an official PR |
| `image_url` | string | No | Article thumbnail |
| `fetched_at` | timestamp | Yes | When we fetched this article |

**Relationships**:
- Belongs to: Company (optional)

---

### 4. Price (Market Data)

Two types of price data:

#### 4a. Metal Prices (Commodities)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `commodity` | string | Yes | Commodity name (Gold, Silver, Copper, etc.) |
| `symbol` | string | Yes | Yahoo Finance symbol (GC=F, SI=F, etc.) |
| `price` | decimal | Yes | Current price per unit |
| `currency` | string | Yes | Price currency (default: USD) |
| `change_percent` | decimal | No | Daily change percentage |
| `day_high` | decimal | No | Day's high |
| `day_low` | decimal | No | Day's low |
| `prev_close` | decimal | No | Previous close |
| `source` | string | No | Data source (yfinance) |
| `fetched_at` | timestamp | Yes | When price was fetched |

**Supported Commodities**:
- Gold (GC=F)
- Silver (SI=F)
- Copper (HG=F)
- Platinum (PL=F)
- Palladium (PA=F)
- Nickel (^SPGSIK)
- Uranium (UX=F)

#### 4b. Stock Price History

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `company_id` | integer | Yes | FK to companies |
| `date` | date | Yes | Trading date |
| `open` | decimal | No | Opening price |
| `high` | decimal | No | High price |
| `low` | decimal | No | Low price |
| `close` | decimal | No | Closing price |
| `volume` | bigint | No | Trading volume |

---

### 5. User

Platform user accounts (managed by Supabase Auth).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key (Supabase Auth UID) |
| `email` | string | Yes | User email |
| `email_verified` | boolean | Yes | Email verification status |
| `created_at` | timestamp | Yes | Account creation date |
| `last_sign_in` | timestamp | No | Last login timestamp |

**Profile Extension** (to be added):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display_name` | string | No | User's display name |
| `avatar_url` | string | No | Profile picture URL |
| `preferences` | jsonb | No | User preferences (theme, notifications) |
| `tier` | string | Yes | Subscription tier (free, pro, institutional) |

**Relationships**:
- Has one: Subscription
- Has many: Watchlists

---

### 6. Subscription

User subscription for premium features.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `user_id` | uuid | Yes | FK to auth.users |
| `tier` | string | Yes | Tier: "free", "pro", "institutional" |
| `status` | string | Yes | Status: "active", "canceled", "past_due", "trialing" |
| `stripe_customer_id` | string | No | Stripe customer ID |
| `stripe_subscription_id` | string | No | Stripe subscription ID |
| `current_period_start` | timestamp | No | Billing period start |
| `current_period_end` | timestamp | No | Billing period end |
| `cancel_at_period_end` | boolean | No | Whether subscription will cancel |
| `created_at` | timestamp | Yes | When subscription was created |
| `updated_at` | timestamp | Yes | Last update |

**Tier Definitions**:

| Tier | Price | Features |
|------|-------|----------|
| Free | $0/mo | Basic company data, delayed prices, 10 companies watchlist |
| Pro | $29/mo | Real-time prices, unlimited watchlist, export, API access (1000/day) |
| Institutional | $299/mo | All Pro features + bulk export, API (10000/day), priority support |

---

## Supporting Entities

### TechnicalReport
NI 43-101 and other technical reports.

### MineralEstimate
Resource/reserve estimates from technical reports.

### ProjectEconomics
PEA/PFS/DFS economic study results.

### MineProduction
Quarterly/annual production data.

### ReservesResources
Mineral reserves and resources by category.

### Financials
Quarterly/annual financial statements.

### InsiderTransaction
Insider buying/selling activity.

---

## Entity Relationships Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Company   │────<│   Project   │────<│ Production  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   └────<│ Reserves    │
       │                         └─────────────┘
       │
       ├────<│ News        │
       │     └─────────────┘
       │
       ├────<│ Price       │
       │     │ History     │
       │     └─────────────┘
       │
       └────<│ Financials  │
             └─────────────┘

┌─────────────┐     ┌─────────────┐
│    User     │────<│Subscription │
└─────────────┘     └─────────────┘
       │
       └────<│ Watchlist   │
             └─────────────┘

┌─────────────┐
│ Metal Price │ (standalone)
└─────────────┘
```

---

## Notes

1. **Timestamps**: All entities use `created_at` and `updated_at` with automatic triggers.
2. **Soft Deletes**: Not implemented - using hard deletes with cascading.
3. **UUIDs vs Integers**: User IDs are UUIDs (Supabase Auth), all other entities use serial integers.
4. **Currency**: Stock prices in CAD, metal prices in USD (industry standard).
