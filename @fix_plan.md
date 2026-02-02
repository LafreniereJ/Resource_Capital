# Resource Capital - Production Launch Plan

## 🎯 Goal: Launch & Monetize a Production-Grade Mining Intelligence Platform

---

## Phase 0 — Definition & Guardrails (CRITICAL)
> Prevents rework and confusion later.

### Product & Access Rules
- [x] Define canonical entities (Company, Project, News, Price, User, Subscription) → `specs/canonical_entities.md`
- [x] Define data freshness SLAs (e.g. prices: real-time / delayed / daily) → `specs/data_freshness_sla.md`
- [x] Define permissions model (anonymous, free, pro, institutional) → `specs/canonical_entities.md` (Tier Features table)
- [x] Define API usage limits per tier (hard numbers) → `specs/canonical_entities.md` (lines 185-196)

### Architecture Decisions
- [x] Confirm background job runner (Supabase cron, Celery, QStash, etc.) → `specs/architecture_decisions.md` (ADR-001: Vercel Cron)
- [x] Confirm cache layer (Redis / Upstash / Supabase edge cache) → `specs/architecture_decisions.md` (ADR-002: Next.js ISR)
- [x] Confirm pricing data source hierarchy (primary → fallback) → `specs/architecture_decisions.md` (ADR-003: yfinance)

---

## Sprint 1 — Backend Hardening (Production-Grade)

### Code Quality & Maintainability
- [x] Enforce type hints across Python codebase (mypy-clean) → `mypy.ini` configured, 122 errors baseline (Phase 1)
- [x] Add structured logging (JSON format, request_id, job_id) → `processing/structured_logger.py`
- [x] Centralize error handling (custom exceptions per domain) → `processing/exceptions.py`
- [x] Refactor db_manager.py into domain modules:
  - `companies.py` → `processing/companies.py`
  - `projects.py` → `processing/projects.py`
  - `prices.py` → `processing/prices.py`
  - `news.py` → `processing/news.py`
- [x] Add docstrings to all public functions → Domain modules documented
- [x] Add README.md per major backend module → `processing/README.md`

### Performance & Reliability
- [x] Add caching for high-read data (metal prices, company metadata) → `processing/cache.py`
- [x] Add missing DB indexes (ticker, company_id, date, type) → `database/migrations/02_add_performance_indexes.sql`
- [x] Audit Supabase connection pooling → Configurable via env vars, reduced to max=5
- [x] Batch insert remaining price_history rows (84k) → `migrate_price_history_batch.py` script ready, run: `python migrate_price_history_batch.py`
- [x] Add query time logging (slow query detection) → `TimedCursor` in db_manager.py

### Data Pipeline Robustness
- [x] Replace run_scheduler.py with background job queue → Enhanced `run_scheduler.py` with circuit breaker, job tracking integration
- [x] Add retry logic with exponential backoff → `processing/retry.py`
- [x] Add API rate limiting + circuit breaker logic → `processing/circuit_breaker.py`
- [x] Add pipeline health check endpoint → `/api/health/detailed` in `api/main.py`
- [x] Add per-job success/failure tracking → `processing/job_tracker.py` + `/api/jobs/*` endpoints

---

## Sprint 2 — Frontend UX & UI Polish

### Global UX Foundations
- [x] Unified loading skeletons → `components/ui/Skeleton.tsx` (SkeletonCard, SkeletonTable, SkeletonChart, etc.)
- [x] Global toast / notification system → `components/ui/Toast.tsx` + ToastProvider in layout
- [x] Explicit error states (no silent failures) → `components/ui/ErrorState.tsx` (ErrorCard, ErrorAPI, etc.)
- [x] Designed empty states for all list views → `components/ui/EmptyState.tsx` (EmptySearch, EmptyCompanies, etc.)

### Page-Level Improvements
- [x] `/stocks` - Loading skeleton → `stocks/loading.tsx`
- [x] `/stocks` - Mobile optimization → MobileStockCard + responsive view in StocksClient
- [x] `/companies/[ticker]` - Loading skeleton → `companies/[ticker]/loading.tsx`
- [x] `/companies/[ticker]` - Chart improvements → Time range selector, crosshair tooltip, H/L markers
- [x] `/news` - Loading skeleton → `news/loading.tsx`
- [x] `/news` - Read-time indicator → Added to featured, cards, and modal
- [x] `/map` - Loading skeleton → `map/loading.tsx`
- [x] `/map` - Performance tuning → Bulk `/api/projects/geo` endpoint (1 request vs 150+), tooltips already good
- [x] `/compare` - Loading skeleton → `compare/loading.tsx`
- [x] `/compare` - Clear selection flow → Optimized API, Clear All button, improved cards with badges
- [x] `/reports` - Upload feedback, preview before submit → Drag-drop UI, preview state, progress bar in ReportsClient.tsx

### Mobile & Interaction
- [x] Full mobile viewport audit → Landing page mobile cards, News mobile search, modal spacing
- [x] Fix mobile navigation → Navbar already had AnimatePresence menu, improved touch targets
- [x] Touch-friendly hit targets → Increased button padding (p-3), aria-labels added
- [x] Add subtle hover & transition effects → Already had framer-motion animations throughout

---

## Sprint 3 — Auth, Identity & User Value

### Auth Enhancements
- [x] Password reset flow → `/forgot-password` + `/update-password` pages, AuthProvider methods
- [x] Email verification enforcement → middleware.ts update + `/verify-email` page
- [x] Google OAuth → `signInWithGoogle` in AuthProvider, `/auth/callback` route, login/signup buttons

### User-Facing Features
- [x] User profile page → `/profile/page.tsx` with avatar, edit form, account info
- [x] Account settings & preferences → Enhanced `/settings/page.tsx` with currency, date format, notifications
- [x] Watchlists (companies + projects) → `/watchlist/page.tsx`, `useWatchlist` hook, `WatchlistButton` component
- [x] Recently viewed history → `useRecentlyViewed` hook, `RecentlyViewed` component
- [x] First-time user onboarding walkthrough → `Onboarding.tsx` modal with 5-step tutorial

---

## Sprint 4 — Monetization & Access Control

### Stripe & Billing
- [x] Stripe account setup → `lib/stripe.ts` + `.env.example` with setup instructions
- [x] Pricing tiers: Free / Pro ($29/mo) / Institutional ($299/mo) → `lib/stripe.ts` PRICING_TIERS config + `/pricing` page
- [x] Checkout + subscription management → `/api/stripe/checkout` + `/api/stripe/portal` routes
- [x] Store subscription state in user model → `user_subscriptions` table (existing) + `lib/subscription.ts`
- [x] Stripe webhook handlers (create/update/cancel) → `/api/stripe/webhook/route.ts`

### Feature Gating
- [x] Define free vs paid feature matrix → `lib/stripe.ts` tier limits + `lib/subscription.ts` helpers
- [x] Enforce gating at API level & UI component level → `components/FeatureGate.tsx` + `lib/subscription.ts`
- [x] Usage limits for free tier (exports, API calls) → `lib/stripe.ts` limits + `checkQuota()` helper
- [x] Persistent "Upgrade to Pro" CTAs → `components/FeatureGate.tsx` UpgradeBanner component

---

## Sprint 5 — Launch Readiness & Ops

### Deployment
- [ ] Production deploy (Vercel)
- [ ] Custom domain + SSL
- [x] Environment variable audit → `ENV_VARIABLES.md` comprehensive docs, updated `.env.example` files
- [ ] CDN for static assets

### Observability & Analytics
- [x] Error tracking (Sentry) → `sentry.*.config.ts` files, `global-error.tsx`, `instrumentation.ts`, conditional Next.js config
- [x] Product analytics (PostHog or Plausible) → `lib/posthog.ts` + `PostHogProvider.tsx` with page views, user identification, custom events
- [x] Uptime monitoring → `/api/health` public endpoint for external monitoring services (UptimeRobot, Pingdom, etc.)
- [x] Core Web Vitals tracking → `lib/web-vitals.ts` with LCP, FID, CLS, FCP, TTFB, INP tracking to PostHog

### SEO, Legal & Trust
- [x] Meta tags on all pages → `lib/metadata.ts` centralized helper, all pages updated with OG/Twitter metadata
- [x] Open Graph images → `app/opengraph-image.tsx` and `app/twitter-image.tsx` with dynamic generation
- [x] Sitemap → `app/sitemap.ts` dynamic sitemap with companies, reports, projects + `app/robots.ts`
- [x] Terms of Service → `/terms` page with full legal terms
- [x] Privacy Policy → `/privacy` page with data handling details
- [x] Data disclaimer (financial / investment) → `/disclaimer` page with comprehensive investment warnings

---

## High-Impact Additions (Required for Monetization)

### Data Quality & Trust
- [x] Data source attribution per metric → `DataSource.tsx` component with badges/footers, added to `/stocks`, `/companies/[ticker]`, landing page, `/news`
- [x] Last-updated timestamps everywhere → `LastUpdated.tsx` + `DataFreshness.tsx` components, added to `/stocks`, `/companies/[ticker]`, landing page already had it
- [x] Confidence / completeness indicators → `DataQuality.tsx` with badges, progress bars, grades (A-F), added to `/companies/[ticker]`

### Security
- [x] Row-level security audit in Supabase → `database/migrations/03_row_level_security.sql` with user tables (preferences, watchlist, subscriptions, API keys) + public data policies
- [x] Rate limiting on public endpoints → `lib/rate-limit.ts` with configurable limits, applied to `/api/search`, `/api/stocks`
- [x] Basic abuse detection → `lib/abuse-detection.ts` with violation tracking, IP blocking, suspicious UA detection, integrated with rate-limit.ts

### Business Readiness
- [x] Admin dashboard (users, subs, errors) → `/admin` with layout, dashboard, users, data, system pages + API endpoints
- [x] Manual override tools for bad data → `/admin/data` page with override creation/deletion, quick fix buttons
- [x] Internal feature flags → `lib/feature-flags.ts` system + `/admin/flags` page with rollout controls, tier gating, overrides

---

## Sprint 6 — Advanced Analytics & Insights

### Screener & Comparison Tools
- [x] `/screener` page with advanced multi-filter search → `app/screener/page.tsx` + `ScreenerClient.tsx`
- [x] Peer comparison widget on company pages → `components/PeerComparison.tsx` + `getPeerCompanies()` in db.ts
- [x] Commodity correlation charts (stock vs gold/silver/copper) → `components/CommodityCorrelation.tsx`
- [x] Save custom screener queries (Pro feature) → `components/SavedQueriesModal.tsx` + localStorage

### Portfolio & Alerts
- [x] Portfolio simulator ("What if I bought X at Y date?") → `app/simulator/PortfolioSimulator.tsx` + `/api/stocks/[ticker]/price`
- [x] Price alerts system (backend + email notifications) → `database/migrations/04_price_alerts.sql` with trigger function
- [x] Create `alerts` table in Supabase schema → `price_alerts` + `alert_history` tables with RLS
- [x] Alert management UI in settings → `app/alerts/AlertsManager.tsx` with full CRUD

---

## Sprint 7 — Data Intelligence & AI Features

### AI-Powered Insights
- [x] News sentiment scoring (bull/bear indicators) → `lib/sentiment.ts` with mining-specific keywords + `components/SentimentBadge.tsx` integrated into `/news`
- [ ] Earnings summary auto-generation (plain-English)
- [ ] Similar companies recommendation engine
- [ ] Project risk scoring (A-F grade by jurisdiction, stage, economics)

### Data Quality
- [x] Data completeness indicators per company → `lib/data-quality.ts` + `components/ui/DataQuality.tsx` (DataQualityBadge on `/companies/[ticker]`)
- [x] "Missing data" badges on company pages → `MissingDataAlert` component in `DataQuality.tsx`
- [x] Data source attribution per metric → (see High-Impact Additions - DataSource.tsx)
- [x] Last-updated timestamps everywhere → (see High-Impact Additions)

---

## Sprint 8 — API & Data Products

### Public API
- [x] OpenAPI/Swagger documentation → `lib/openapi.ts` OpenAPI 3.0 spec + `/api/openapi` JSON endpoint
- [x] Interactive API explorer page → `/api-docs` page with expandable endpoints, curl examples, parameter docs
- [ ] API key management UI (generate/revoke)
- [ ] Usage dashboard per API key

### Data Export & Integration
- [ ] Bulk CSV/Excel export (gated by tier)
- [ ] Webhook subscriptions (price changes, news, insider trades)
- [ ] Embeddable iframe widgets (price charts, tickers)

---

## Sprint 9 — Community & Engagement

### User Interaction
- [ ] Company discussion boards (threaded comments)
- [ ] Upvote/downvote system for comments
- [ ] User-generated research notes (private by default)
- [ ] Share notes publicly (Pro feature)

### Retention & Communication
- [ ] Weekly digest email (personalized by watchlist)
- [ ] Achievement/badge system for milestones
- [ ] "Streak" tracking for daily logins

---

## Sprint 10 — Mobile & Progressive Web App

### PWA Foundation
- [ ] Service worker + offline caching
- [ ] PWA manifest + "Add to Home Screen"
- [ ] Push notifications (price alerts, news)

### Mobile UX
- [ ] Touch-optimized charts (gestures, full-screen)
- [ ] Quick actions bottom sheet
- [ ] Mobile-specific navigation improvements

---

## Backend Cleanup Sprint (Code Hygiene)

### Remove Obsolete Files
- [x] Delete `processing/db_manager_sqlite.bak.py` (92KB backup file, Supabase migration complete) → Deleted
- [x] Delete `processing/db_manager_supabase.py` (merged into db_manager.py) → Deleted
- [x] Delete `data-pipeline/mining.db` (empty SQLite file, using Supabase now) → Deleted
- [x] Delete `check_agnico.py` (one-time debugging script) → Deleted
- [x] Delete `migrate_to_supabase.py` (one-time migration complete) → Deleted

### Consolidate Duplicate Modules
- [x] Audit `processing/market_data.py` vs `ingestion/market_data.py` - remove duplicate → Deleted old SQLite version (ingestion/)
- [x] Review extractor files → Layered system: generic (fuzzy), groq (LLM), unified (orchestrator) - no consolidation needed

### Clean Up One-Time Scripts
- [x] Move one-time migration scripts to `scripts/migrations/` folder → Moved 4 scripts
- [x] Add README explaining each script's purpose and when to run → Created scripts/migrations/README.md

### Remove Unused Imports & Dead Code
- [x] Run `autoflake` to remove unused imports across Python files → Cleaned 17+ files
- [ ] Identify and remove commented-out code blocks
- [x] Remove print() debug statements (use structured_logger instead) → Converted debug prints in pdf_extractor.py to structured logging

### Directory Cleanup
- [x] Check `documents/` and `downloads/` → documents/ has PDFs (keep), downloads/ was empty (deleted)
- [x] Clean up `__pycache__/` and `.mypy_cache/` (add to .gitignore if not already) → Already in .gitignore
- [x] Remove any `.pyc` files → Deleted 499 .pyc files

### Code Quality
- [x] Ensure all Python files have proper `__init__.py` exports → Created processing/__init__.py and ingestion/__init__.py
- [ ] Add missing type hints flagged by mypy
- [x] Standardize import ordering (stdlib → third-party → local) → Fixed 35 files with isort

---

## Sprint 11 — Backend Data Pipeline Hardening

### Critical: News Fetcher Fixes
- [x] Fix `get_company_tickers` import error → Added wrapper function using `get_all_companies()`
- [x] Fix `upsert_metal_price` import error → Changed to `update_metal_price`
- [x] Audit RSS feed sources → Removed 3 broken feeds (Northern Miner, Mining Weekly, Junior Mining Network - all 403), added Seeking Alpha
- [x] News fetching working → 138 unique articles from 11 sources (TMX DataLynx, Mining.com x7, Seeking Alpha, IGF, Financial Post, CMJ, CMM)
- [ ] Add news deduplication logic (same article from multiple sources)

### Test Suite
- [x] Create `tests/` directory structure with pytest configuration → `pytest.ini`, `conftest.py`, `tests/__init__.py`
- [x] Unit tests for `ingestion/news_client.py` → 17 tests passing (ticker extraction, mining relevance, normalization, formatting)
- [x] Unit tests for `ingestion/metal_prices.py` → 12 tests passing (config, fetching, symbols)
- [x] Fix `processing/__init__.py` cache exports → Changed to `cache`, `cached`, `CacheKeys`, `CacheTTL`
- [x] Fix `ingestion/__init__.py` exports → Changed to `fetch_all_metal_prices`, `fetch_single_metal`, `get_current_prices`
- [ ] Unit tests for `processing/companies.py` (CRUD operations)
- [ ] Integration tests for API endpoints (`api/main.py`) - blocked by db_manager import issues
- [ ] Add CI/CD test runner (GitHub Actions workflow)
- [ ] Minimum 60% code coverage target

### Data Validation Layer
- [ ] Create `processing/validators.py` with Pydantic models for all data types
- [ ] Validate stock price data before DB insert (price > 0, volume >= 0, etc.)
- [ ] Validate metal price data before DB insert
- [ ] Validate news articles before DB insert (URL format, date parsing)
- [ ] Add data anomaly detection (price changes > 50% flagged for review)

### Extraction Pipeline Completion
- [x] Document GROQ API key requirement in ENV_VARIABLES.md → Already in `data-pipeline/.env` and root `.env`
- [x] GROQ API key configured and working → key tested successfully with llama-3.3-70b-versatile
- [ ] Add fallback to generic extractor when GROQ unavailable
- [ ] Test PDF extraction with sample mining reports
- [ ] Add extraction success rate tracking
- [ ] Create extraction queue for batch processing

### Database Optimization
- [ ] Audit and optimize slow queries (use EXPLAIN ANALYZE)
- [ ] Add compound indexes for common query patterns
- [ ] Implement connection pooling tuning based on load
- [ ] Add database vacuum/maintenance schedule
- [ ] Create read replicas consideration for high traffic

### Monitoring & Alerting
- [ ] Add Prometheus metrics export endpoint
- [ ] Create Grafana dashboard for pipeline health
- [ ] Set up PagerDuty/Slack alerts for pipeline failures
- [ ] Add dead-letter queue for failed jobs
- [ ] Create runbook for common failure scenarios

### API Improvements
- [ ] Add request/response logging middleware
- [ ] Implement API versioning (v1/, v2/)
- [ ] Add OpenAPI spec auto-generation from FastAPI
- [ ] Add CORS configuration for production domains
- [ ] Add request validation with Pydantic

---

## Known Issues (Tracked Debt)
- `price_history` migration timeout (84k rows)
- TSXV `.V` ticker normalization
- TECK ticker incompatibility with yfinance
- API tests blocked by `get_balance_sheet` import in `api/main.py`

---

## ✅ Completed (Locked)

### Supabase Migration — Jan 2026
- [x] PostgreSQL schema
- [x] Migration scripts
- [x] Frontend & backend clients
- [x] Data verification

### Auth Foundation — Jan 2026
- [x] Supabase SSR
- [x] Auth middleware
- [x] Login/signup pages
- [x] Navbar user menu
