## whealthy · Wealth Longevity Planner

Client-side planner for modelling lifetime wealth under configurable spending rules, taxes, inflation/real modes, philanthropy, and private commitments. Everything runs locally in the browser—no analytics, no external network calls.

### Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui primitives
- Zustand (persisted to `localStorage`) + Zod validation
- Recharts for deterministic and Monte Carlo visualisations
- Vitest + React Testing Library

### Features

- Spending rule engine (fixed, % of wealth, guardrails)
- Philanthropy by fixed amount or % of wealth
- Tax drag modelling with public/private yield decomposition
- Private commitments engine (calls, distributions, MOIC)
- One-off inflow/outflow scheduling
- Deterministic and Monte Carlo projections with ruin probability
- Liquidity runway metric based on liquid assets vs next-year needs
- JSON import/export, seed presets, and persisted state

### Local Development

```bash
npm install
npm run dev
```

The app is served at [http://localhost:3000](http://localhost:3000).

Run the test suite (unit, property, and snapshot tests):

```bash
npm run test
```

### Docker

Build and serve the app through Docker:

```bash
docker compose up --build
```

This starts the development server on port 3000. The `Dockerfile` also supports a production build (`npm run build` + `npm run start`).

### Project Structure Highlights

- `src/lib/` – Zod types, default parameters, simulation and tax models
- `src/store/` – Zustand store with persistence helpers
- `src/components/` – UI, charts, tables, and parameter forms
- `src/app/page.tsx` – Planner shell bringing the tabs together
- `Dockerfile`, `docker-compose.yml` – containerised local setup

### Notes

- CSP locks the app to self-hosted assets only.
- Monte Carlo paths are capped at 2,000 for responsiveness.
- Sequence risk visualisation (5/25/50/75/95 percentiles) accompanies deterministic projections.
- Acceptance baseline: defaults show no deterministic ruin to age 95, liquidity runway displays, Monte Carlo renders when enabled, JSON import/export round-trips parameters.
