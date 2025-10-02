# BettingArbitrage

Full‑stack TypeScript monorepo for a betting odds aggregation + arbitrage insight platform.

## Stack
- Client: Vite + React + TypeScript + Tailwind + shadcn/ui components
- Server: Node/Express (index.ts + routes.ts) + auth.ts + scheduler.ts (cron / polling) + storage.ts (likely persistence abstraction)
- Shared: Zod or schema utilities in `shared/schema.ts` (cross client/server validation)
- ML: Basic predictive logic under `server/ml/predictions.ts`

## Directory Layout
```
client/      React front-end
server/      API + schedulers + ML helpers
shared/      Shared schema/types
```

## Quick Start
```bash
# Install (root hoists deps if using single package.json)
npm install

# Dev client (from root if scripts forwarded, else cd client)
npm run dev      # or: cd client && npm run dev

# Dev server (hot reload if script exists)
npm run server   # or: cd server && npm run dev

# Type check
npm run typecheck

# Lint (add ESLint if missing)
npm run lint
```

## Suggested npm Scripts (add to package.json if not present)
```jsonc
{
  "scripts": {
    "dev": "vite --config client/vite.config.ts",
    "server": "ts-node --project tsconfig.json server/index.ts",
    "build:client": "vite build --config client/vite.config.ts",
    "build:server": "tsc -p tsconfig.json --outDir dist/server",
    "build": "npm run build:client && npm run build:server",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier -w ."
  }
}
```

## Auth
- `client/hooks/use-auth.tsx` + `server/auth.ts` should share validation contracts from `shared/schema.ts`.

## Scheduling
- `server/scheduler.ts`: ensure cron/poll intervals are configurable via env.

## ML
- `server/ml/predictions.ts`: isolate pure functions; avoid side effects for testability.

## Environment Variables (create `.env`)
```
PORT=3000
NODE_ENV=development
JWT_SECRET=change_me
DATABASE_URL=postgres://user:pass@host:5432/db   # if used
REDIS_URL=redis://localhost:6379                 # if used
```

## Build & Deploy (example)
```bash
# Production build
npm run build
# Serve client build via reverse proxy; run server:
node dist/server/index.js
```

## Testing (add)
- Add Jest or Vitest:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```
Example script:
```json
"test": "vitest run",
"test:watch": "vitest"
```

## Quality Checklist
- [ ] Add ESLint + Prettier config
- [ ] Enforce strict TypeScript (`"strict": true`)
- [ ] Centralize API base URLs in one config
- [ ] Wrap fetch/axios with retry + timeout
- [ ] Input validation with shared schemas
- [ ] Rate limiting / auth middleware on server
- [ ] Graceful shutdown (SIGINT/SIGTERM) in `server/index.ts`
- [ ] Avoid secrets in repo
- [ ] Add health endpoint `/healthz`
- [ ] Add Dockerfile (multi-stage) if containerizing

## Possible Issues to Review Manually
- Confirm imports in component library (no circular dependencies)
- Ensure no direct browser-only APIs used server-side
- Verify `shared/schema.ts` exports only serializable types
- Check that `use-toast.ts` + `toaster.tsx` not duplicating context
- Confirm `ml/predictions.ts` does not block event loop (offload heavy compute if needed)

## Security / Hardening
- Helmet middleware on Express
- CORS restricted origins
- JWT expiry + refresh strategy
- Input sanitization (Zod + server validation)
- Rate limit + request logging

## Future Enhancements
- Real-time updates via WebSocket/Subs
- Feature flags
- CI pipeline: lint + typecheck + unit tests gate

## License
See `LICENSE`.