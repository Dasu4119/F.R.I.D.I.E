# Security Baseline

v0.1 follows privacy by default, least privilege, explicit consent for sensitive operations, defense in depth, and auditability.

## Implemented now

- Environment-only secrets and an ignored `.env` file.
- Request schema and length validation.
- Trace IDs and structured audit records.
- MongoDB connectivity isolated behind the FastAPI service.
- No generated-code execution, plugin installation, filesystem mutation, or arbitrary outbound network access.
- Honest UI labels for connected versus planned capabilities.
- Explicit plan approval before any future execution handoff. Approval records a bounded summary locally and never starts tools.
- Owner-scoped run listing and idempotent approval in the local API, with an append-only first-approval audit event.
- Schema-constrained local-model planning with server-owned trace IDs, task IDs, timestamps, and status derivation.
- Independent graph verification before persistence; rejected or unavailable model drafts use a labeled deterministic fallback.

## Required before broader release

- Local account authentication, secure password hashing, session expiry, optional MFA, and role checks at every API boundary.
- Encryption-at-rest key strategy and encrypted backup/restore tests.
- Docker execution sandbox with explicit network, filesystem, CPU, memory, and time budgets.
- Permission manifests and isolation for plugins.
- Prompt-injection and malicious-file defenses in the document pipeline.
- User-reviewed memory approval/deletion and a documented retention policy.

The current local single-user mode is a development boundary, not a substitute for authorization.

The Ollama base URL and selected model are server-side environment settings. The model-assisted endpoint treats the goal as untrusted data, accepts only the planning schema, suppresses raw provider errors, and never exposes tool or execution fields. It is separate from the hosted deterministic route and from all tool-execution paths.
