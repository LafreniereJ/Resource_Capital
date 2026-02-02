# Resource Capital - Institutional Grade Upgrade Plan

## Executive Summary

This document outlines the required technical and operational improvements to transform Resource Capital from a development prototype into an institutional-grade, monetizable mining intelligence platform.

**Current State:** Functional prototype with legal/technical blockers for commercial deployment
**Target State:** Production-ready SaaS platform suitable for institutional subscribers

---

## Critical Issues (Must Fix Before Monetization)

### 1. Data Licensing Violation

**Current:** yfinance for stock and metal prices
**Problem:** yfinance scrapes Yahoo Finance, which explicitly prohibits commercial use in their Terms of Service. This creates:
- Legal liability for the business
- No SLA or reliability guarantees
- Data can break without notice
- Cannot redistribute to paying customers

**Impact:** Cannot legally charge customers until resolved

### 2. Database Architecture

**Current:** SQLite (file-based)
**Problems:**
- Single writer lock (one write operation at a time)
- No concurrent user support at scale
- No replication or high availability
- Cannot horizontally scale
- File corruption risk under load

**Impact:** Will fail under production load with multiple users

### 3. No Authentication/Authorization

**Current:** No user system
**Problems:**
- Cannot identify users
- Cannot implement subscription tiers
- Cannot track usage
- Cannot restrict premium content
- No audit trail

**Impact:** Impossible to monetize

---

## Technology Replacement Matrix

| Component | Current | Replacement | Priority | Est. Cost |
|-----------|---------|-------------|----------|-----------|
| Stock Data | yfinance | TMX Datalinx or Polygon.io | P0 | $50-500/mo |
| Metal Prices | yfinance | Kitco API or LME | P0 | $0-200/mo |
| Database | SQLite | PostgreSQL (Supabase/Neon) | P0 | $25-100/mo |
| Authentication | None | Clerk or Supabase Auth | P0 | $0-50/mo |
| Hosting (FE) | Local | Vercel | P1 | $20-50/mo |
| Hosting (API) | Local | Railway or Render | P1 | $10-50/mo |
| Payments | None | Stripe | P1 | 2.9% + $0.30/txn |
| Caching | None | Redis (Upstash) | P2 | $0-20/mo |
| Monitoring | None | Sentry + Uptime Robot | P2 | $0-30/mo |
| CDN | None | Cloudflare or Vercel Edge | P2 | $0-20/mo |

---

## Detailed Component Analysis

### Data Providers for Canadian Mining Stocks

#### Option A: TMX Datalinx (Recommended for TSX Focus)
- **What:** Official data provider for Toronto Stock Exchange
- **Coverage:** Complete TSX/TSXV coverage including all mining companies
- **Latency:** Real-time and delayed options
- **Licensing:** Proper redistribution rights available
- **Cost:** Enterprise pricing (contact for quote, typically $500-2000/mo)
- **Pros:** Official source, legally clear, complete coverage
- **Cons:** Expensive, enterprise sales process

#### Option B: Polygon.io (Best Value)
- **What:** Modern market data API
- **Coverage:** US + Canadian markets
- **Latency:** Real-time available
- **Tiers:**
  - Starter: $29/mo (delayed data)
  - Developer: $79/mo (real-time, limited)
  - Business: $199/mo (full access)
  - Enterprise: Custom pricing for redistribution
- **Pros:** Clean API, good documentation, reasonable pricing
- **Cons:** May need enterprise tier for legal redistribution

#### Option C: Alpha Vantage (Budget Option)
- **What:** Financial data API
- **Coverage:** Global including TSX
- **Tiers:**
  - Free: 25 requests/day
  - Premium: $50-250/mo
- **Pros:** Affordable, decent coverage
- **Cons:** Rate limits, less reliable, slower

#### Option D: IEX Cloud
- **What:** Clean financial data API
- **Coverage:** Primarily US, limited Canadian
- **Cost:** $9-500/mo depending on tier
- **Pros:** Excellent API design
- **Cons:** Canadian coverage gaps

**Recommendation:** Start with Polygon.io Business ($199/mo), upgrade to TMX Datalinx or Polygon Enterprise when revenue supports it.

---

### Metal/Commodity Price Sources

#### Option A: Kitco API
- **What:** Precious metals specialist
- **Coverage:** Gold, Silver, Platinum, Palladium
- **Cost:** Contact for commercial pricing
- **Pros:** Industry standard for precious metals

#### Option B: London Metal Exchange (LME)
- **What:** Official base metals exchange
- **Coverage:** Copper, Nickel, Zinc, Lead, Aluminum, Tin
- **Cost:** Licensed data packages
- **Pros:** Official source

#### Option C: Metals-API
- **What:** Aggregated metals pricing API
- **Coverage:** Precious + base metals
- **Cost:** $15-150/mo
- **Pros:** Easy integration, affordable
- **Cons:** Aggregated (not primary source)

#### Option D: Quandl (Nasdaq Data Link)
- **What:** Financial/commodity datasets
- **Coverage:** Comprehensive commodities
- **Cost:** Varies by dataset
- **Pros:** Institutional grade
- **Cons:** Complex pricing

**Recommendation:** Metals-API for MVP ($50/mo), transition to official sources (Kitco + LME) for institutional credibility.

---

### Database Migration: SQLite → PostgreSQL

#### Why PostgreSQL
1. **Concurrency:** Proper multi-user read/write support
2. **ACID Compliance:** Transaction safety for financial data
3. **Decimal Precision:** Accurate for stock prices (NUMERIC type)
4. **PostGIS:** Geospatial support for project map features
5. **Full-Text Search:** Built-in for news/company search
6. **JSON Support:** Flexible schema when needed
7. **Replication:** Read replicas for scale
8. **Industry Standard:** Battle-tested, extensive tooling

#### Managed PostgreSQL Options

| Provider | Free Tier | Pro Tier | Pros | Cons |
|----------|-----------|----------|------|------|
| **Supabase** | 500MB, 2 projects | $25/mo (8GB) | Auth included, great DX | Newer platform |
| **Neon** | 512MB, branching | $19/mo+ | Serverless, branching | Newer platform |
| **PlanetScale** | 5GB | $29/mo | MySQL (not Postgres) | MySQL only |
| **Railway** | $5 credit | Usage-based | Simple deployment | Less features |
| **AWS RDS** | 12mo free tier | $15-100/mo | Industry standard | Complex |
| **Render** | None | $7/mo+ | Simple | Limited free tier |

**Recommendation:** Supabase Pro ($25/mo) - includes PostgreSQL + Auth + Storage + Realtime subscriptions.

#### Migration Path

```
Phase 1: Schema Translation
- Convert SQLite types to PostgreSQL equivalents
- Add proper indexes
- Set up foreign key constraints

Phase 2: Data Migration
- Export SQLite data
- Transform as needed
- Import to PostgreSQL
- Verify row counts and data integrity

Phase 3: Application Update
- Update frontend db.ts (use @vercel/postgres or Supabase client)
- Update backend db_manager.py (use psycopg2 or asyncpg)
- Update connection strings via environment variables

Phase 4: Testing
- Run all existing functionality
- Load testing with concurrent users
- Verify data accuracy
```

---

### Authentication Architecture

#### Requirements
- User registration/login
- Email verification
- Password reset
- Session management
- Role-based access (free/premium/enterprise)
- API key management (for programmatic access)
- OAuth providers (Google, LinkedIn for professional users)

#### Option A: Clerk (Recommended)
- **Free:** 10,000 MAU
- **Pro:** $25/mo + $0.02/MAU over 10k
- **Pros:**
  - Excellent Next.js integration
  - Pre-built components
  - Webhook support
  - Organization/team support
  - Modern UI
- **Setup:** ~2-4 hours

#### Option B: Supabase Auth
- **Free:** 50,000 MAU
- **Pro:** Included with Supabase Pro
- **Pros:**
  - Integrated with Supabase DB
  - Row-level security
  - No additional vendor
- **Cons:**
  - Less polished components
  - More DIY
- **Setup:** ~4-8 hours

#### Option C: NextAuth.js (Auth.js)
- **Cost:** Free (self-hosted)
- **Pros:**
  - Full control
  - No vendor lock-in
  - Flexible providers
- **Cons:**
  - More implementation work
  - Must manage sessions yourself
  - Security responsibility on you
- **Setup:** ~8-16 hours

**Recommendation:** If using Supabase for DB, use Supabase Auth. Otherwise, Clerk for fastest time-to-market.

---

### Subscription & Payment System

#### Stripe Implementation

```
Subscription Tiers (Example):

Free Tier:
- Delayed stock data (15-min)
- Basic company profiles
- Limited news access
- No API access

Professional ($49/mo):
- Real-time stock data
- Full company profiles
- Unlimited news
- Basic API access (1000 calls/day)
- Portfolio tracking
- Email alerts

Institutional ($299/mo):
- Everything in Professional
- Bulk data exports
- Advanced API (10000 calls/day)
- Custom alerts
- Priority support
- Historical data access

Enterprise (Custom):
- Unlimited API
- White-label options
- Custom integrations
- SLA guarantees
- Dedicated support
```

#### Stripe Integration Components
1. **Checkout Session:** For new subscriptions
2. **Customer Portal:** Self-service subscription management
3. **Webhooks:** Handle subscription events (created, updated, canceled)
4. **Metering:** Track API usage for overage billing

---

### Hosting Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare                           │
│                    (DNS, CDN, DDoS Protection)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                              │
│                   (Next.js Frontend)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pages     │  │  API Routes │  │   Edge      │         │
│  │   (SSR)     │  │  (Serverless)│  │  Functions  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Supabase     │ │ Railway/Render  │ │     Upstash     │
│   (PostgreSQL   │ │   (FastAPI      │ │     (Redis      │
│   + Auth)       │ │   Data Pipeline)│ │     Cache)      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Data Providers │
                    │  (Polygon, etc) │
                    └─────────────────┘
```

#### Deployment Configuration

**Vercel (Frontend):**
- Framework: Next.js
- Build: Automatic from Git
- Environment: Production + Preview
- Cost: $20/mo Pro (includes team features)

**Railway (Backend API):**
- Service: FastAPI
- Deployment: Docker or Nixpacks
- Cost: ~$10-30/mo based on usage

**Supabase (Database):**
- PostgreSQL with pgvector (for future AI features)
- Cost: $25/mo Pro

---

### Security Checklist

#### Authentication & Authorization
- [ ] Implement proper session management
- [ ] Add CSRF protection
- [ ] Implement rate limiting (per user and global)
- [ ] Add brute force protection on login
- [ ] Secure password requirements
- [ ] Email verification flow

#### Data Protection
- [ ] Encrypt data at rest (database-level)
- [ ] TLS/SSL for all connections
- [ ] Sanitize all user inputs
- [ ] Parameterized queries (prevent SQL injection)
- [ ] XSS protection headers

#### Infrastructure
- [ ] Environment variables for secrets (never commit)
- [ ] Separate staging/production environments
- [ ] Regular security dependency updates
- [ ] Backup strategy with tested recovery

#### Compliance Considerations
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie consent (if serving EU)
- [ ] Data retention policy
- [ ] GDPR considerations for EU users

---

### Monitoring & Observability

#### Error Tracking: Sentry
- Automatic error capture
- Stack traces with source maps
- User context for debugging
- Free tier: 5k errors/mo
- Cost: $26/mo for Team

#### Uptime Monitoring: Better Uptime or Uptime Robot
- Endpoint monitoring
- Alerting (email, Slack, SMS)
- Status page for customers
- Free tier available
- Cost: $20-50/mo for pro features

#### Application Monitoring: Vercel Analytics
- Core Web Vitals
- Performance metrics
- Included with Vercel Pro

#### Log Management
- Vercel logs for frontend
- Railway logs for backend
- Consider Logtail for aggregation ($0-25/mo)

---

## Implementation Phases

### Phase 1: Legal & Foundation (Weeks 1-2)
**Goal:** Remove legal blockers and establish production infrastructure

- [ ] Sign up for Polygon.io or alternative data provider
- [ ] Sign up for Metals-API or alternative
- [ ] Create Supabase project
- [ ] Design PostgreSQL schema
- [ ] Migrate data from SQLite
- [ ] Update application to use PostgreSQL
- [ ] Implement Supabase Auth or Clerk
- [ ] Basic login/register flow

**Exit Criteria:** Application runs on PostgreSQL with licensed data and user auth

### Phase 2: Deployment & Payments (Weeks 3-4)
**Goal:** Deploy to production and enable monetization

- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Configure custom domain
- [ ] Set up Cloudflare (DNS + CDN)
- [ ] Implement Stripe subscriptions
- [ ] Create subscription tiers
- [ ] Build billing management UI
- [ ] Add usage metering for API

**Exit Criteria:** Users can sign up, subscribe, and pay

### Phase 3: Hardening (Weeks 5-6)
**Goal:** Production-ready reliability and security

- [ ] Implement Redis caching layer
- [ ] Add rate limiting
- [ ] Set up Sentry error tracking
- [ ] Configure uptime monitoring
- [ ] Security audit
- [ ] Load testing
- [ ] Create status page
- [ ] Write documentation

**Exit Criteria:** System handles production load with proper monitoring

### Phase 4: Growth Features (Ongoing)
**Goal:** Competitive differentiation

- [ ] API access for subscribers
- [ ] Advanced alerting system
- [ ] Portfolio tracking
- [ ] AI-powered analysis (using pgvector)
- [ ] Custom report generation
- [ ] Mobile responsiveness audit
- [ ] White-label options

---

## Cost Projections

### Minimum Viable Production
| Item | Monthly Cost |
|------|--------------|
| Data Provider (Polygon Business) | $199 |
| Metals Data (Metals-API) | $50 |
| Database (Supabase Pro) | $25 |
| Hosting (Vercel Pro) | $20 |
| Backend (Railway) | $20 |
| Auth (Included in Supabase) | $0 |
| Monitoring (Free tiers) | $0 |
| **Total** | **~$314/mo** |

### Growth Stage
| Item | Monthly Cost |
|------|--------------|
| Data Provider (Polygon Enterprise) | $500 |
| Metals Data (Kitco) | $150 |
| Database (Supabase Pro) | $75 |
| Hosting (Vercel Pro) | $50 |
| Backend (Railway) | $50 |
| Cache (Upstash) | $20 |
| Monitoring (Sentry Team) | $26 |
| **Total** | **~$871/mo** |

### Break-Even Analysis
At $314/mo fixed costs:
- 7 Professional subscribers ($49/mo) = $343/mo ✓
- 2 Institutional subscribers ($299/mo) = $598/mo ✓

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data provider rate limits | Medium | High | Implement caching, multiple providers |
| Database performance issues | Low | High | Proper indexing, read replicas |
| Security breach | Low | Critical | Security audit, penetration testing |
| Provider price increases | Medium | Medium | Architectural flexibility, reserves |
| Competitor with more data | High | Medium | Focus on UX, niche features, AI |

---

## Success Metrics

### Technical KPIs
- Uptime: >99.9%
- API response time: <200ms p95
- Error rate: <0.1%
- Data freshness: <1 minute for real-time

### Business KPIs
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- API usage per tier

---

## Next Steps

1. **Immediate:** Decide on data provider and sign contract
2. **This Week:** Set up Supabase project and begin schema migration
3. **Next Week:** Implement authentication
4. **Following Weeks:** Deploy and integrate Stripe

---

*Document Version: 1.0*
*Created: January 2026*
*Status: Planning*
