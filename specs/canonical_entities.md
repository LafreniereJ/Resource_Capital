# Canonical Entities - Resource Capital

> **Purpose**: Single source of truth for all domain entities in the platform.
> **Status**: Approved (Phase 0)
> **Last Updated**: 2026-01-20

---

## Core Entities

### 1. Company

The central entity representing a TSX/TSXV mining company.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key (auto-increment) |
| `ticker` | string | Yes | Unique stock ticker (e.g., "ABX", "NEM.TO") |
| `name` | string | Yes | Company legal name |
| `exchange` | string | No | Exchange code: "TSX", "TSXV" (default: "TSX") |
| `commodity` | string | No | Primary commodity: "Gold", "Silver", "Copper", etc. |
| `description` | text | No | Company description |
| `website` | string | No | Company website URL |
| `currency` | string | No | Trading currency (default: "CAD") |
| `current_price` | decimal | No | Latest stock price |
| `market_cap` | decimal | No | Market capitalization |
| `high_52w` | decimal | No | 52-week high |
| `low_52w` | decimal | No | 52-week low |
| `avg_volume` | bigint | No | Average daily volume |
| `prev_close` | decimal | No | Previous day close |
| `day_change` | decimal | No | Today's price change |
| `day_change_percent` | decimal | No | Today's % change |
| `last_updated` | timestamp | No | Last price update time |
| `created_at` | timestamp | Yes | Record creation time |
| `updated_at` | timestamp | Yes | Record update time |

**Relationships**:
- Has many `Project`
- Has many `News`
- Has many `PriceHistory`
- Has many `Financials`

---

### 2. Project

A mining project owned by a company (mine, exploration site, development project).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `company_id` | integer | Yes | FK to Company |
| `name` | string | Yes | Project name |
| `location` | string | No | Geographic location (region/country) |
| `latitude` | decimal | No | GPS latitude |
| `longitude` | decimal | No | GPS longitude |
| `stage` | string | No | Stage: "Exploration", "Development", "Production", "Closure" |
| `commodity` | string | No | Primary commodity |
| `ownership_percentage` | decimal | No | Ownership % (0-100, default: 100) |
| `created_at` | timestamp | Yes | Record creation time |
| `updated_at` | timestamp | Yes | Record update time |

**Relationships**:
- Belongs to `Company`
- Has many `ReservesResources`
- Has many `MineProduction`
- Has many `ProjectEconomics`

---

### 3. News

News articles and press releases related to mining companies.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `external_id` | string | No | Unique ID from source (for deduplication) |
| `title` | string | Yes | Article headline |
| `description` | text | No | Article summary/body |
| `url` | string | Yes | Source URL |
| `source` | string | No | Source name: "TMX Newsfile", "Mining.com", etc. |
| `published_at` | timestamp | No | Publication date |
| `company_id` | integer | No | FK to Company (if company-specific) |
| `ticker` | string | No | Related ticker |
| `category` | string | No | Category: "Earnings", "Drilling", "M&A", etc. |
| `is_press_release` | boolean | No | True if official press release |
| `image_url` | string | No | Thumbnail image URL |
| `fetched_at` | timestamp | Yes | When we fetched it |

**Relationships**:
- Belongs to `Company` (optional)

---

### 4. Price (Metal Prices)

Current and historical commodity prices.

#### MetalPrice (Current)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `commodity` | string | Yes | Commodity name: "Gold", "Silver", "Copper", etc. |
| `symbol` | string | Yes | Trading symbol: "GC=F", "SI=F", etc. |
| `price` | decimal | Yes | Current price |
| `currency` | string | No | Currency (default: "USD") |
| `change_percent` | decimal | No | Daily % change |
| `day_high` | decimal | No | Day high |
| `day_low` | decimal | No | Day low |
| `prev_close` | decimal | No | Previous close |
| `source` | string | No | Data source (default: "yfinance") |
| `fetched_at` | timestamp | Yes | Fetch timestamp |

#### PriceHistory (Stock Historical)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `company_id` | integer | Yes | FK to Company |
| `date` | date | Yes | Trading date |
| `open` | decimal | No | Open price |
| `high` | decimal | No | High price |
| `low` | decimal | No | Low price |
| `close` | decimal | No | Close price |
| `volume` | bigint | No | Trading volume |

**Supported Commodities**:
- Gold (GC=F)
- Silver (SI=F)
- Copper (HG=F)
- Platinum (PL=F)
- Palladium (PA=F)
- Nickel (NI=F)
- Uranium (UX1! or proxy)

---

### 5. User

Platform user account (managed by Supabase Auth).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key (Supabase auth.users.id) |
| `email` | string | Yes | Email address |
| `full_name` | string | No | Display name |
| `avatar_url` | string | No | Profile image URL |
| `subscription_tier` | string | No | "free", "pro", "institutional" |
| `subscription_status` | string | No | "active", "canceled", "past_due" |
| `stripe_customer_id` | string | No | Stripe customer ID |
| `created_at` | timestamp | Yes | Account creation time |
| `updated_at` | timestamp | Yes | Last update time |

**Relationships**:
- Has one `Subscription`
- Has many `Watchlist` items
- Has many `Alert`

**Note**: Core user data lives in Supabase `auth.users`. Extended profile data in a `profiles` table.

---

### 6. Subscription

User subscription and billing information.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK to User |
| `tier` | string | Yes | "free", "pro", "institutional" |
| `status` | string | Yes | "active", "canceled", "past_due", "trialing" |
| `stripe_subscription_id` | string | No | Stripe subscription ID |
| `stripe_customer_id` | string | No | Stripe customer ID |
| `current_period_start` | timestamp | No | Billing period start |
| `current_period_end` | timestamp | No | Billing period end |
| `cancel_at_period_end` | boolean | No | Will cancel at period end |
| `created_at` | timestamp | Yes | Subscription creation time |
| `updated_at` | timestamp | Yes | Last update time |

**Tier Features**:

| Feature | Free | Pro ($29/mo) | Institutional ($299/mo) |
|---------|------|--------------|-------------------------|
| Stock data | 15-min delayed | Real-time | Real-time |
| Company profiles | Basic | Full | Full |
| News access | 10/day | Unlimited | Unlimited |
| API calls | None | 1,000/day | 10,000/day |
| Watchlists | 1 (5 items) | 10 (50 items) | Unlimited |
| Alerts | None | 10 | Unlimited |
| Data export | None | CSV | CSV, Excel, API |
| Historical data | 1 year | 5 years | 10+ years |
| Priority support | No | Email | Phone + Email |

---

## Supporting Entities

### Watchlist

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK to User |
| `name` | string | Yes | Watchlist name |
| `is_default` | boolean | No | Default watchlist flag |
| `created_at` | timestamp | Yes | Creation time |

### WatchlistItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key |
| `watchlist_id` | uuid | Yes | FK to Watchlist |
| `company_id` | integer | Yes | FK to Company |
| `added_at` | timestamp | Yes | When added |
| `notes` | text | No | User notes |

### Alert

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK to User |
| `company_id` | integer | No | FK to Company |
| `alert_type` | string | Yes | "price_above", "price_below", "news", "volume" |
| `threshold` | decimal | No | Trigger value |
| `is_active` | boolean | Yes | Active flag |
| `last_triggered` | timestamp | No | Last trigger time |
| `created_at` | timestamp | Yes | Creation time |

---

## Entity Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Company   │──────<│   Project   │       │    News     │
│             │       │             │       │             │
│ ticker (UK) │       │ company_id  │       │ company_id  │
│ name        │       │ name        │       │ title       │
│ exchange    │       │ stage       │       │ source      │
│ commodity   │       │ location    │       │ published   │
│ price data  │       │ lat/long    │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │
       │              ┌──────┴──────┐
       │              │             │
       ▼              ▼             ▼
┌─────────────┐ ┌───────────┐ ┌──────────────┐
│PriceHistory │ │ Reserves  │ │  Production  │
│             │ │ Resources │ │              │
│ date        │ │           │ │ period_end   │
│ OHLCV       │ │ category  │ │ output       │
└─────────────┘ │ tonnage   │ │ costs        │
                │ grade     │ └──────────────┘
                └───────────┘

┌─────────────┐       ┌──────────────┐
│    User     │──────<│ Subscription │
│             │       │              │
│ email       │       │ tier         │
│ profile     │       │ status       │
│             │       │ stripe_id    │
└─────────────┘       └──────────────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐ ┌─────────────┐
│  Watchlist  │ │    Alert    │
│             │ │             │
│ name        │ │ type        │
│ items[]     │ │ threshold   │
└─────────────┘ └─────────────┘
```

---

## Implementation Notes

1. **User entity** uses Supabase Auth - profile data in separate `profiles` table
2. **Subscription entity** integrates with Stripe - webhook-driven updates
3. **Price data** has two sources: yfinance (free) and potential premium APIs
4. **Company ticker** is the primary lookup key - must be unique
5. **All timestamps** use UTC (TIMESTAMPTZ in PostgreSQL)

---

## Migration Path

The following tables need to be added to complete the entity model:

- [ ] `profiles` - Extended user profile data
- [ ] `subscriptions` - Stripe subscription tracking
- [ ] `watchlists` - User watchlists
- [ ] `watchlist_items` - Items in watchlists
- [ ] `alerts` - User price/news alerts

These are scheduled for **Sprint 3** (Auth & User Features).
