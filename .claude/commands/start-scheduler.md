---
description: Start the market data scheduler (runs every 15 min)
allowed-tools: Bash(python:*)
---

Start the continuous market data scheduler that updates stock and metal prices every 15 minutes.

```bash
cd data-pipeline && python run_scheduler.py --market
```

This will run in the foreground. Press Ctrl+C to stop.
