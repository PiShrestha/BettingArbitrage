# BettingArbitrage

Full-stack arbitrage analytics sandbox that pairs a TypeScript ingestion/API layer with a Spring Boot risk microservice and a Spark backtester. The goal is to demonstrate a realistic multi-language architecture that can ingest odds ticks, surface risk-aware opportunities, and replay strategies against historical data — all while staying small enough to run locally.

> ⚠️ **Disclaimer** — This codebase is for technical experimentation only. It does **not** place bets, integrate with bookmakers, or constitute financial advice. Use fictional data and comply with all local regulations.

## Architecture

```
┌─────────────────┐    ┌────────────────────────┐
│ Providers /     │    │  Node / Express API    │
│ Fixture feeds   │──▶ │  (ingest + scheduler)  │
└─────────────────┘    │  • Normalise markets   │
                       │  • Cache in Redis       │
                       │  • Persist to Postgres  │
                       └──────────┬─────────────┘
                                  │ REST (JSON)
                                  ▼
                       ┌────────────────────────┐
                       │ Spring Boot analytics  │
                       │  /api/analyze          │
                       │  /api/simulate         │
                       │  • Risk metrics        │
                       │  • Monte Carlo         │
                       └──────────┬─────────────┘
                                  │ Async job triggers
                                  ▼
                       ┌────────────────────────┐
                       │ Spark backtester       │
                       │  • Parquet snapshots   │
                       │  • PnL curves          │
                       │  • Sharpe / drawdown   │
                       └────────────────────────┘

React + Vite client consumes the Node APIs for live opportunities, runs ad-hoc simulations, and visualises heatmaps/backtests.

## Directory Layout

```
client/             React UI + dashboards
server/             Node ingestion API + schedulers + ML helpers
shared/             Zod schemas shared across TypeScript surfaces
analytics-service/  Spring Boot microservice (risk + Monte Carlo)
spark-backtester/    PySpark job for historical backtests
docker-compose.yml   Local orchestration (Postgres, Redis, services)

```

## Prerequisites

- Node.js 20+
- npm 10+
- Java 17 + Maven (for the analytics service)
- Python 3.10 + Apache Spark (optional, for the backtester)
- Docker Desktop (optional but recommended for the composed stack)

## Quick Start (local dev)

```bash
# Install TypeScript workspace deps
npm install

# Start the Spring analytics service
cd analytics-service
mvn spring-boot:run

# In a new terminal – run the Node API + scheduler (serves client too)
cd ..
npm run dev

# Visit the dashboard (after authenticating) at http://localhost:3000
```

### Docker Compose workflow

```bash
docker compose up --build
```

Services exposed:

- `http://localhost:3000` — Node API + React client
- `http://localhost:8081` — Spring analytics microservice (`/actuator/health` for probes)
- `postgres://localhost:5432` — Postgres (dev credentials in compose file)
- `redis://localhost:6379` — Redis cache

> Compose mounts the repo into the Node container for live reload and builds the Spring Boot JAR via its Dockerfile.

## Services

### Node ingestion + API (`server/`)

- `server/scheduler.ts` ingests fixture providers every 15 seconds, stores markets, and delegates to the analytics service for opportunity detection with risk metrics. A local TypeScript arbitrage detector is retained as a fallback when the microservice is unavailable.
- REST endpoints under `/api/arbitrage/*` expose live opportunities, history, markets, and trigger extra Monte Carlo runs.
- Shared contracts live in `shared/schema.ts` and include risk and simulation payloads consumed by both layers.

### Spring Boot analytics microservice (`analytics-service/`)

- `/api/analyze` accepts a market snapshot payload and returns arbitrage opportunities enriched with:
  - Stake allocations per provider
  - Expected value / standard deviation
  - Kelly sizing suggestions
  - Sharpe approximation, VaR, and baseline Monte Carlo summary
- `/api/simulate` reruns Monte Carlo with custom trial counts to power on-demand simulations from the UI.
- Actuator endpoints provide health/metrics for observability. Build with `mvn package` or run with `mvn spring-boot:run`.

### Spark backtester (`spark-backtester/`)

- `backtest.py` outlines a PySpark job that loads historical odds snapshots (Parquet), reconstructs best quotes per event, simulates bet execution, and writes both trade ledgers and summary metrics (mean return, volatility, win-rate).
- Extend this job to compute CAGR, drawdowns, or to persist results back into Postgres for retrieval via `/api/backtest/{id}`.

## Risk & Simulation Metrics

Key analytics surfaced on each opportunity (see `shared/schema.ts`):

- **Implied probability**: `1 / decimal_odds`
- **Expected value**: `Σ(prob_i × payoff_i) − bankroll`
- **Standard deviation**: Variance of outcome distribution
- **Kelly fraction**: `(b·p − q) / b`, clipped to non-negative values
- **Sharpe ratio**: `(mean_return − r_f) / stddev_return`, with a 1% annual risk-free default
- **Value at Risk (95%)**: 5th percentile of simulated distribution
- **Monte Carlo summary**: Trials, mean, σ, and probability of positive profit

These metrics power the dashboard’s risk panel and simulation drawer.

## Environment variables

Create a root `.env` (or export env vars when using Docker):

```
PORT=3000
NODE_ENV=development
JWT_SECRET=change_me
ANALYTICS_URL=http://localhost:8081
ANALYTICS_TIMEOUT_MS=8000
DATABASE_URL=postgres://arbitrage:arbitrage@localhost:5432/arbitrage (optional persistence)
REDIS_URL=redis://localhost:6379
```

## Testing & Quality Gates

- **TypeScript layer**: `npm run test` (Vitest) exercises ingestion, arbitrage detection, and simulations.
- **Spring microservice**: `mvn test` inside `analytics-service/` (add JUnit tests under `src/test/java`).
- **Spark job**: Add PySpark unit tests around `backtest.py` transformations using small Parquet fixtures.

CI suggestion: lint → typecheck → Vitest → `mvn -pl analytics-service test` → package Docker images.

## Monitoring & Ops

- Spring Actuator (`/actuator/health`, `/actuator/metrics`) for probes.
- Extend Node logs/metrics via Prometheus or OpenTelemetry if deploying beyond local dev.
- `docker-compose.yml` is configured for quick local orchestration; for production, add TLS, secrets management, and persisted storage beyond the demo volumes.

## Security Notes

- All credentials/secrets should be injected via environment variables or a secret manager.
- Add rate limiting, CORS restrictions, input validation (already provided by Zod/Spring validators), and robust auth (see `server/auth.ts`).
- The repo intentionally avoids real bookmaker integrations; keep it that way unless you have the legal right to access such feeds.

## License

MIT — see [`LICENSE`](./LICENSE).
