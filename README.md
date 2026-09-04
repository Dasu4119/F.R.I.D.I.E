# F.R.I.D.I.E.

Fast Reasoning, Intelligent Development, Analysis & Innovation Engine.

F.R.I.D.I.E. is a privacy-first AI workbench that divides a user goal into dependency-aware specialist tasks, makes assumptions and confidence visible, and requires verification before handoff.

## What works in v0.2

- Responsive command center with an honest system-readiness view.
- Deterministic goal decomposition into planning, research, design, engineering, testing, and verification tasks.
- Structured public API contract with trace IDs, dependencies, acceptance checks, assumptions, and limitations.
- Authenticated FastAPI service backed by MongoDB Atlas database `FRIDIE`.
- Startup index creation for projects, runs, tasks, memories, documents, and audit logs.
- Explicit plan approval with bounded, durable owner-scoped history.
- Owner-only Sites authentication and a same-origin server proxy that keeps service credentials out of browser code.
- Owner-scoped MongoDB run history and idempotent, audited approval endpoints.
- Configurable Ollama adapter with truthful connection/model readiness status.
- Verifier-gated model-assisted planning with schema validation and deterministic fallback.
- A loopback-only Windows companion prototype for explicitly approved, allowlisted app launches.
- Security baseline, design system, UX contract, architecture notes, tests, and CI.

The API can create model-assisted plans, while the hosted command center uses deterministic planning through its authenticated persistence route. The Windows companion is not remotely connected and cannot execute arbitrary commands. Docker code execution, vector search, plugins, app-owned accounts, and agent execution are intentionally not connected yet.

## Architecture

```text
Owner-only web command center -> Sites server proxy -> FastAPI planner
                                                   -> MongoDB Atlas FRIDIE
                                                   -> Audit log
```

The hosted web slice uses same-origin routes for deterministic goal creation, persistent run history, and approval. Those routes authenticate the Sites user and add a server-only FastAPI bearer credential. `services/api` owns Atlas persistence and the boundary that future model and sandbox adapters will use.

## Run the web app

Requirements: Node.js 24+ and npm 11+.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Validate the production build with:

```bash
npm run verify
```

## Run MongoDB and the API

Requirements: Docker Desktop with Compose.

1. Copy `.env.example` to `.env`.
2. Change the example MongoDB password in `.env`.
3. Start the local services:

```bash
docker compose up --build
```

The API is available at `http://127.0.0.1:8000`, OpenAPI at `/docs`, and health at `/health`. MongoDB binds to localhost only.

To inspect local model readiness, install and start Ollama on the host, set `FRIDIE_OLLAMA_MODEL` to an installed model name, then call `GET /api/v1/models/ollama/status`.

To create a verifier-gated local-model plan, call `POST /api/v1/goals/model-assisted` with the same goal body used by `/api/v1/goals`. The response identifies whether Ollama passed verification or the deterministic fallback was used.

Example goal request:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/goals \
  -H "Authorization: Bearer $FRIDIE_SERVICE_TOKEN" \
  -H "X-FRIDIE-User: local-owner" \
  -H "Content-Type: application/json" \
  -d '{"goal":"Build an accessible project dashboard with MongoDB persistence."}'
```

## Repository map

- `app/` — command-center UI and hosted planning route.
- `lib/fridie/` — TypeScript domain contract and deterministic planner.
- `services/api/` — FastAPI, PyMongo Async persistence, and backend tests.
- `services/companion/` — loopback-only, permission-gated Windows application launcher.
- `docs/` — architecture, database, and security decisions.
- `PRODUCT.md` — v0.2 outcome and acceptance criteria.
- `DESIGN.md` / `UX-CONTRACT.md` — durable visual and behavior contracts.
- `tests/` — contract, accessibility, and build-level tests.

## Database naming

The product is displayed as `F.R.I.D.I.E.`. The MongoDB database is `FRIDIE` because dots are not valid in cross-platform MongoDB database names.

## Next vertical slice

Replace the temporary Atlas network allowlist with stable private egress or an Atlas access configuration restricted to the deployed API, then add backup/restore verification and retention controls.
