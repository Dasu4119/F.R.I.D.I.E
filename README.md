# F.R.I.D.I.E.

Fast Reasoning, Intelligent Development, Analysis & Innovation Engine.

F.R.I.D.I.E. is a privacy-first AI workbench that divides a user goal into dependency-aware specialist tasks, makes assumptions and confidence visible, and requires verification before handoff.

## What works in v0.1

- Responsive command center with an honest system-readiness view.
- Deterministic goal decomposition into planning, research, design, engineering, testing, and verification tasks.
- Structured public API contract with trace IDs, dependencies, acceptance checks, assumptions, and limitations.
- Local FastAPI service backed by MongoDB database `FRIDIE`.
- Startup index creation for projects, runs, tasks, memories, documents, and audit logs.
- Explicit plan approval with a capped, device-local approval history.
- Owner-scoped MongoDB run history and idempotent, audited approval endpoints.
- Configurable Ollama adapter with truthful connection/model readiness status.
- Verifier-gated model-assisted planning with schema validation and deterministic fallback.
- A loopback-only Windows companion prototype for explicitly approved, allowlisted app launches.
- Security baseline, design system, UX contract, architecture notes, tests, and CI.

The local API can create model-assisted plans, but the hosted command center remains deterministic. The Windows companion is not remotely connected and cannot execute arbitrary commands. Docker code execution, vector search, plugins, authentication, and agent execution are intentionally not connected yet.

## Architecture

```text
Web command center -> Orchestrator API -> Planner -> Specialist task graph
                                      -> MongoDB FRIDIE
                                      -> Audit log
```

The hosted web slice uses a deterministic route at `/api/orchestrate`. The local service in `services/api` implements the persistence boundary that future model and sandbox adapters will use.

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
  -H "Content-Type: application/json" \
  -d '{"goal":"Build an accessible project dashboard with MongoDB persistence."}'
```

## Repository map

- `app/` — command-center UI and hosted planning route.
- `lib/fridie/` — TypeScript domain contract and deterministic planner.
- `services/api/` — FastAPI, PyMongo Async persistence, and backend tests.
- `services/companion/` — loopback-only, permission-gated Windows application launcher.
- `docs/` — architecture, database, and security decisions.
- `PRODUCT.md` — v0.1 outcome and acceptance criteria.
- `DESIGN.md` / `UX-CONTRACT.md` — durable visual and behavior contracts.
- `tests/` — contract, accessibility, and build-level tests.

## Database naming

The product is displayed as `F.R.I.D.I.E.`. The MongoDB database is `FRIDIE` because dots are not valid in cross-platform MongoDB database names.

## Next vertical slice

Add an explicit local mode to the command center, route it through the FastAPI service, and show the returned planning source and verifier outcome without weakening the hosted deterministic fallback.
