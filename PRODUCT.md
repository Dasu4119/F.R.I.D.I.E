# F.R.I.D.I.E. v0.2 Product Brief

F.R.I.D.I.E. (Fast Reasoning, Intelligent Development, Analysis & Innovation Engine) is a privacy-first AI workbench that turns a user's goal into an explainable, verifiable execution plan.

## v0.2 outcome

An authenticated owner can submit a goal, receive a dependency-aware plan assigned to specialist agents, inspect assumptions and confidence, explicitly approve it, and revisit bounded durable history. The owner-only Sites application proxies requests to FastAPI without exposing its service credential. FastAPI persists projects, runs, tasks, approval transitions, and audit events in MongoDB Atlas `FRIDIE`.

## Acceptance criteria

1. The command center accepts a non-empty goal and prevents duplicate submission.
2. The orchestrator returns structured tasks with an owner, phase, status, dependencies, and acceptance check.
3. Results expose confidence, assumptions, limitations, and an immutable trace ID.
4. The interface remains usable with keyboard navigation, narrow screens, reduced motion, and server errors.
5. The API stores runs in MongoDB Atlas database `FRIDIE`; connection secrets are environment-only.
6. Automated checks cover planning behavior, HTML metadata, TypeScript/lint, the production build, and the backend planner.
7. Plan approval is explicit, does not start execution, and updates owner-scoped Atlas history.
8. The local API can list owner-scoped runs, approve a run idempotently, audit the first approval, and report Ollama connectivity without claiming a model is ready when it is not installed.
9. The model-assisted planning endpoint constrains Ollama output to a JSON schema, independently verifies task dependencies and handoff structure, and persists only a verified model plan or an explicit deterministic fallback.
10. Model failures and rejected drafts never expose raw provider details or enable tools, filesystem access, or generated-code execution.
11. Every private API route rejects missing or invalid service credentials with `401`; the browser calls only authenticated same-origin Sites routes.
12. A server-derived HMAC owner ID scopes database reads and mutations; email and service credentials are never forwarded to FastAPI or the browser response.

## Scope boundary

v0.2 provides authenticated deterministic orchestration, approval contracts, durable Atlas history, and a verifier-gated Ollama planning route in the API. Executing generated code in Docker, installing plugins, embeddings/vector search, app-owned accounts, and multi-user collaboration are later milestones. The UI must not represent these as already active.

## Source documents

The eight supplied F.R.I.D.A.I.E. architecture PDFs are the authoritative product inputs reviewed on 2026-08-30. Where they specify SQLite, the user's later decision to use MongoDB takes precedence.
