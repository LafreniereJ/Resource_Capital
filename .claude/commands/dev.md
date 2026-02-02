---
description: Start the development environment (frontend + optional backend)
allowed-tools: Bash(npm:*, node:*, uvicorn:*)
---

Start the development servers:

1. **Frontend** (Next.js on port 3000):
```bash
cd frontend && npm run dev
```

2. **Backend API** (FastAPI on port 8000 - optional, frontend uses direct DB):
```bash
cd data-pipeline && uvicorn api.main:app --reload --port 8000
```

The frontend is the main interface. Backend API is only needed for mobile apps or external access.
