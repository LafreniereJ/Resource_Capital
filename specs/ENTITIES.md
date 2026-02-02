# Canonical Entities Specification

> **Version**: 1.0
> **Last Updated**: 2026-01-20
> **Status**: Active

This document defines the canonical entities for Resource Capital. All code, APIs, and UI should use these definitions consistently.

---

## 1. Company

A publicly traded mining company on TSX or TSXV.

### Core Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `ticker` | string | Yes | Stock symbol (e.g., "ABX", "NEM.TO") |
| `name` | string | Yes | Company name |
| `exchange` | enum | Yes | "TSX" or "TSXV" |
| `commodity` | string | No | Primary commodity (Gold, Silver, Copper, etc.) |
| `description` | text | No | Company description |
| `website` | url | No | Company website |

### Market Data Fields
| Field | Type | Description |
|-------|------|-------------|
| `current_price` | decimal(12,4) | Latest stock price |
| `prev_close` | decimal(12,4) | Previous day's close |
| `day_change` | decimal(12,4) | Price change today |
| `day_change_percent` | decimal(8,4) | Percent change today |
| `day_open` | decimal(12,4) | Opening price |
| `day_high` | decimal(12,4) | Day's high |
| `day_low` | decimal(12,4) | Day's low |
| `day_volume` | bigint | Trading volume |
| `market_cap` | decimal(18,2) | Market capitalization |
| `high_52w` | decimal(12,4) | 52-week high |
| `low_52w` | decimal(12,4) | 52-week low |
| `avg_volume` | bigint | Average trading volume |
| `currency` | string | Trading currency (CAD/USD) |
| `last_updated` | timestamp | Last market data refresh |

### Relationships
- Has many **Projects**
- Has many **News** articles
- Has many **Filings**
- Has many **Financials**
- Has many **InsiderTransactions**

### Business Rules
- Ticker must be unique
- Exchange must be TSX or TSXV
- Market data refreshes every 15 minutes during trading hours

---

## 2. Project

A mining project or property owned by a company.

### Core Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `company_id` | integer | Yes | Foreign key to Company |
| `name` | string | Yes | Project name |
| `location` | string | No | Geographic location description |
| `latitude` | decimal(10,6) | No | GPS latitude |
| `longitude` | decimal(10,6) | No | GPS longitude |
| `stage` | enum | No | Development stage |
| `commodity` | string | No | Primary commodity |
| `ownership_percentage` | decimal(5,2) | No | Ownership stake (0-100%) |

### Stage Values
- `Exploration` - Early stage exploration
- `Development` - Mine development phase
- `Production` - Active mining
- `Care & Maintenance` - Temporarily suspended
- `Closure` - Mine closure phase

### Relationships
- Belongs to one **Company**
- Has many **MineProduction** records
- Has many **ReservesResources** estimates
- Has many **ProjectEconomics** studies

### Business Rules
- Ownership percentage must be 0-100%
- Coordinates required for map display

---

## 3. News

News articles related to mining companies.

### Core Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `external_id` | string | No | Source's unique ID (for deduplication) |
| `title` | string | Yes | Article headline |
| `description` | text | No | Article summary/excerpt |
| `url` | url | Yes | Link to full article |
| `source` | string | No | News source (e.g., "Mining.com", "TMX Newsfile") |
| `published_at` | timestamp | No | Publication date |
| `company_id` | integer | No | Related company (if applicable) |
| `ticker` | string | No | Related ticker (for quick lookup) |
| `category` | string | No | News category |
| `is_press_release` | boolean | No | True if official press release |
| `image_url` | url | No | Featured image |
| `fetched_at` | timestamp | Yes | When we fetched this article |

### Sources (Priority Order)
1. TMX Newsfile (official TSX press releases)
2. Mining.com
3. Junior Mining Network
4. Kitco News
5. Reuters Mining

### Business Rules
- `external_id` must be unique per source (prevents duplicates)
- News refreshes every 15 minutes
- Keep 90 days of news (archive older)

---

## 4. Price

Market price data for stocks and metals.

### 4a. Stock Price (Historical)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `company_id` | integer | Yes | Foreign key to Company |
| `date` | date | Yes | Trading date |
| `open` | decimal(12,4) | No | Opening price |
| `high` | decimal(12,4) | No | Day's high |
| `low` | decimal(12,4) | No | Day's low |
| `close` | decimal(12,4) | No | Closing price |
| `volume` | bigint | No | Trading volume |

**Unique Constraint**: (company_id, date)

### 4b. Metal Price (Current)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key |
| `commodity` | string | Yes | Metal name (e.g., "Gold", "Silver") |
| `symbol` | string | Yes | Trading symbol (e.g., "GC=F") |
| `price` | decimal(12,4) | Yes | Current spot price |
| `currency` | string | Yes | Price currency (usually USD) |
| `change_percent` | decimal(8,4) | No | Daily change % |
| `day_high` | decimal(12,4) | No | Day's high |
| `day_low` | decimal(12,4) | No | Day's low |
| `prev_close` | decimal(12,4) | No | Previous close |
| `fetched_at` | timestamp | Yes | Last update time |

### Supported Metals
| Commodity | Symbol | Data Source |
|-----------|--------|-------------|
| Gold | GC=F | yfinance |
| Silver | SI=F | yfinance |
| Copper | HG=F | yfinance |
| Platinum | PL=F | yfinance |
| Palladium | PA=F | yfinance |
| Nickel | ^SPGSIKTR | yfinance |
| Uranium | UX1! | yfinance |

### Business Rules
- Stock prices update every 15 minutes during market hours
- Metal prices update every 15 minutes 24/7
- Historical price data kept indefinitely

---

## 5. User

A registered user of the platform. Uses Supabase Auth.

### Core Fields (from auth.users)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key (Supabase auth ID) |
| `email` | string | Yes | User's email address |
| `created_at` | timestamp | Yes | Registration date |
| `email_confirmed_at` | timestamp | No | Email verification date |
| `last_sign_in_at` | timestamp | No | Last login time |

### Extended Profile (public.user_profiles - TO BE CREATED)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Foreign key to auth.users |
| `display_name` | string | No | User's display name |
| `avatar_url` | url | No | Profile picture |
| `subscription_tier` | enum | Yes | Current subscription level |
| `subscription_status` | enum | Yes | Active, Canceled, Past Due |
| `stripe_customer_id` | string | No | Stripe customer ID |
| `created_at` | timestamp | Yes | Profile creation date |
| `updated_at` | timestamp | Yes | Last update |

### Relationships
- Has one **Subscription**
- Has many **Watchlist** entries
- Has many **RecentlyViewed** entries

### Business Rules
- Email must be verified for full access
- Default subscription tier is "free"
- Stripe customer created on first checkout

---

## 6. Subscription

User subscription for premium access.

### Core Fields (public.subscriptions - TO BE CREATED)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | Foreign key to auth.users |
| `tier` | enum | Yes | Subscription tier |
| `status` | enum | Yes | Current status |
| `stripe_subscription_id` | string | No | Stripe subscription ID |
| `stripe_price_id` | string | No | Stripe price ID |
| `current_period_start` | timestamp | No | Billing period start |
| `current_period_end` | timestamp | No | Billing period end |
| `cancel_at_period_end` | boolean | No | Will cancel at period end |
| `canceled_at` | timestamp | No | When canceled |
| `created_at` | timestamp | Yes | Subscription creation |
| `updated_at` | timestamp | Yes | Last update |

### Subscription Tiers
| Tier | Price | Features |
|------|-------|----------|
| `free` | $0/mo | Delayed data, basic profiles, 10 news/day |
| `pro` | $29/mo | Real-time data, full profiles, unlimited news, API (1k/day) |
| `institutional` | $299/mo | Everything + bulk export, API (10k/day), priority support |

### Status Values
- `active` - Subscription is current and paid
- `trialing` - In free trial period
- `past_due` - Payment failed, grace period
- `canceled` - User canceled
- `unpaid` - Payment failed, access revoked

### Business Rules
- Default tier is "free" (no Stripe subscription)
- Upgrade/downgrade takes effect immediately
- Cancellation takes effect at period end
- Past due subscriptions have 7-day grace period

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│   Company   │───────│   Project   │
└─────────────┘  1:N  └─────────────┘
      │                     │
      │ 1:N                 │ 1:N
      ▼                     ▼
┌─────────────┐       ┌─────────────┐
│    News     │       │ Production  │
└─────────────┘       └─────────────┘
      │
      │ 1:N
      ▼
┌─────────────┐       ┌─────────────┐
│   Filing    │       │   User      │
└─────────────┘       └─────────────┘
                            │
                            │ 1:1
                            ▼
                      ┌─────────────┐
                      │Subscription │
                      └─────────────┘
```

---

## API Response Standards

All API endpoints returning entities should follow this structure:

```json
{
  "data": { ... },          // Single entity or array
  "meta": {
    "total": 100,           // For paginated responses
    "page": 1,
    "per_page": 20,
    "last_updated": "2026-01-20T12:00:00Z"
  },
  "error": null             // Error object if failed
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-20 | Initial entity definitions |
