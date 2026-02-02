---
description: Check recent logs from data pipeline scripts
allowed-tools: Bash(tail:*, cat:*, head:*)
---

Show recent activity from the data pipeline logs:

```bash
echo "=== Stock Prices (last 20 lines) ==="
tail -20 data-pipeline/logs/stock_prices.log 2>/dev/null || echo "No stock price log yet"

echo ""
echo "=== Metal Prices (last 10 lines) ==="
tail -10 data-pipeline/logs/metal_prices.log 2>/dev/null || echo "No metal price log yet"

echo ""
echo "=== Scheduler (last 10 lines) ==="
tail -10 data-pipeline/logs/scheduler.log 2>/dev/null || echo "No scheduler log yet"
```

Summarize any errors or important information found.
