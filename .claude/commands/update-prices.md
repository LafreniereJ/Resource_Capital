---
description: Update all stock and metal prices from yfinance
allowed-tools: Bash(python:*)
---

Update market data by running the price fetchers:

1. First update stock prices for all companies
2. Then update metal/commodity prices
3. Report summary of results

```bash
cd data-pipeline && python fetch_stock_prices.py
cd data-pipeline && python fetch_metal_prices.py
```

Show how many stocks were updated and current metal prices when done.
