# F.R.I.D.I.E. v0.1 Product Brief

F.R.I.D.I.E. (Fast Reasoning, Intelligent Development, Analysis & Innovation Engine) is a privacy-first AI workbench that turns a user's goal into an explainable, verifiable execution plan.

## v0.1 outcome

A user can submit a goal, receive a dependency-aware plan assigned to specialist agents, inspect assumptions and confidence, explicitly approve it, and revisit a bounded device-local approval history. A local FastAPI service persists projects, runs, tasks, approval transitions, and audit events in MongoDB and reports the truthful state of a configurable Ollama connection.

## Acceptance criteria

1. The command center accepts a non-empty goal and prevents duplicate submission.
2. The orchestrator returns structured tasks with an owner, phase, status, dependencies, and acceptance check.
3. Results expose confidence, assumptions, limitations, and an immutable trace ID.
4. The interface remains usable with keyboard navigation, narrow screens, reduced motion, and server errors.
5. The local API stores runs in MongoDB database `FRIDIE`; connection secrets are environment-only.
6. Automated checks cover planning behavior, HTML metadata, TypeScript/lint, the production build, and the backend planner.
7. Plan approval is explicit, does not start execution, and stores at most 10 approval summaries in browser storage.
8. The local API can list owner-scoped runs, approve a run idempotently, audit the first approval, and report Ollama connectivity without claiming a model is ready when it is not installed.
9. The model-assisted planning endpoint constrains Ollama output to a JSON schema, independently verifies task dependencies and handoff structure, and persists only a verified model plan or an explicit deterministic fallback.
10. Model failures and rejected drafts never expose raw provider details or enable tools, filesystem access, or generated-code execution.

## Scope boundary

v0.1 provides deterministic orchestration, approval contracts, UI, persistence, and a verifier-gated Ollama planning route in the local API. The hosted command center remains deterministic until a secure local connection mode is configured. Executing generated code in Docker, installing plugins, embeddings/vector search, authentication, and multi-user collaboration are later milestones. The UI must not represent these as already active.

## Source documents

The eight supplied F.R.I.D.A.I.E. architecture PDFs are the authoritative product inputs reviewed on 2026-08-30. Where they specify SQLite, the user's later decision to use MongoDB takes precedence.
