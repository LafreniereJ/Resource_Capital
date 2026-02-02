# Resource Capital - Environment Variables Reference

This document lists all environment variables used by the Resource Capital platform.

## Frontend (Next.js)

Location: `frontend/.env.local`

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous/public key | `eyJhbGci...` |
| `NEXT_PUBLIC_API_URL` | No | FastAPI backend URL (if using) | `http://localhost:8000` |
| `NEXT_PUBLIC_APP_URL` | No | Production app URL (for sitemap) | `https://resourcecapital.com` |

### Vercel Cron Jobs

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `CRON_SECRET` | **Yes** (production) | Secret for authenticating cron job requests | `random-32-char-string` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** (production) | Supabase service role key for admin operations | `eyJhbGci...` |

### Sentry (Error Tracking)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | **Recommended** | Sentry DSN for error tracking | `https://xxx@sentry.io/123` |
| `SENTRY_AUTH_TOKEN` | No (CI/CD) | Auth token for source map uploads | `sntrys_xxx` |
| `SENTRY_ORG` | No (CI/CD) | Sentry organization slug | `my-org` |
| `SENTRY_PROJECT` | No (CI/CD) | Sentry project name | `resource-capital` |

To set up Sentry:
1. Create account at [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Copy the DSN from Settings > Projects > Client Keys
4. Add `NEXT_PUBLIC_SENTRY_DSN` to your environment

### PostHog (Product Analytics)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | **Recommended** | PostHog project API key | `phc_xxx` |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog API host (US/EU) | `https://us.i.posthog.com` |
| `POSTHOG_DEBUG` | No | Enable analytics in development | `true` |

To set up PostHog:
1. Create account at [posthog.com](https://posthog.com) (free tier available)
2. Create a new project
3. Copy the API key from Project Settings
4. Add `NEXT_PUBLIC_POSTHOG_KEY` to your environment

**Tracked events include:**
- Page views (automatic)
- Stock views and searches
- Screener filter usage
- Alert creation
- Comparison tool usage
- Portfolio simulations
- Report views
- Upgrade clicks

### Vercel-specific (auto-set)
| Variable | Description |
|----------|-------------|
| `VERCEL` | Set to `1` when deployed on Vercel |
| `NEXT_PUBLIC_VERCEL_URL` | Deployment URL |

---

## Data Pipeline (Python/FastAPI)

Location: `data-pipeline/.env`

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_DB_URL` | PostgreSQL connection string | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` |

### Optional - API Keys

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase API URL (for REST API) | - |
| `SUPABASE_KEY` | Supabase service role key | - |
| `GROQ_API_KEY` | Groq API for PDF extraction | - |
| `ANTHROPIC_API_KEY` | Anthropic API for earnings extraction | - |
| `FINNHUB_API_KEY` | Finnhub API for market data | - |
| `NEWSAPI_KEY` | NewsAPI for news aggregation | - |
| `METALS_API_KEY` | Metals-API for commodity prices | - |

### Optional - Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | `INFO` |
| `STRUCTURED_LOGGING` | Enable JSON logging format | `false` |
| `ENABLE_QUERY_LOGGING` | Log all database queries | `false` |
| `SLOW_QUERY_THRESHOLD_MS` | Threshold for slow query logging (ms) | `500` |
| `DB_POOL_MIN_CONN` | Minimum database connections | `1` |
| `DB_POOL_MAX_CONN` | Maximum database connections | `5` |

### Future (Licensed Data Providers)

| Variable | Description |
|----------|-------------|
| `POLYGON_API_KEY` | Polygon.io stock data |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage market data |

---

## Production Deployment Checklist

### Vercel Environment Variables

Set these in Vercel Dashboard > Project Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=https://resourcecapital.com
```

### Supabase Dashboard

1. Go to Settings > Database > Connection string
2. Copy the URI format connection string
3. Set as `SUPABASE_DB_URL` in backend

### Security Notes

1. **NEVER** commit `.env` or `.env.local` to git
2. Use `.env.example` files for documentation
3. Rotate API keys periodically
4. Use different keys for development/production
5. Supabase service role key (`SUPABASE_KEY`) has admin privileges - only use in trusted backends

---

## Quick Setup

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Backend
```bash
cd data-pipeline
cp .env.example .env
# Edit .env with your database credentials
```

---

## Troubleshooting

### "Missing Supabase environment variables!"
- Ensure `.env.local` (frontend) or `.env` (backend) exists
- Verify variable names match exactly (case-sensitive)
- Restart the development server after changes

### "SUPABASE_DB_URL not set"
- Check `data-pipeline/.env` file exists
- Ensure the connection string is valid
- Try connecting with `psql` to verify credentials

### Database connection issues
- Check firewall allows port 5432
- Verify Supabase project is active
- Ensure connection string uses correct password
