# Spark Backtester

Prototype Spark job for replaying historical odds snapshots and computing performance metrics for the arbitrage strategy.

## Requirements

- Apache Spark 3.5+
- Python 3.10+
- Access to Parquet snapshots with the following schema:
  - `timestamp` (timestamp)
  - `event_id` (string)
  - `market_type` (string)
  - `provider` (string)
  - `selection` (string)
  - `decimal_odds` (double)
  - `winner` (string) – label of the winning selection

## Running locally

```bash
export SPARK_HOME=/path/to/spark
${SPARK_HOME}/bin/spark-submit backtest.py \
  --snapshots s3://bucket/odds.parquet \
  --bankroll 1000 \
  --output ./out
```

The job writes a Parquet file containing the simulated trade ledger plus an aggregated JSON metrics file with Sharpe ratio, CAGR, maximum drawdown, and hit rate.

## Next steps

- Move CLI arguments to a config service or job scheduler
- Persist metrics in Postgres for surfacing via `/api/backtest/{id}`
- Integrate with the Node API to trigger async runs from the dashboard
