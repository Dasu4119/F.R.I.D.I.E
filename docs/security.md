# Security Baseline

v0.2 follows privacy by default, least privilege, explicit consent for sensitive operations, defense in depth, and auditability.

## Implemented now

- Environment-only secrets and an ignored `.env` file.
- Request schema and length validation.
- Trace IDs and structured audit records.
- MongoDB connectivity isolated behind the FastAPI service.
- No generated-code execution, plugin installation, filesystem mutation, or arbitrary outbound network access.
- Honest UI labels for connected versus planned capabilities.
- Private API routes require a constant-time-checked bearer service credential and reject missing or invalid credentials with `401`.
- The owner-only Sites server proxy maps the stable platform user ID to `owner_id`; email is not forwarded to FastAPI.
- The FastAPI service credential exists only in server environment variables and never in browser JavaScript, URLs, or responses.
- Explicit plan approval before any future execution handoff. Approval updates Atlas and never starts tools.
- Owner-scoped run listing and idempotent approval, with an append-only first-approval audit event.
- Schema-constrained local-model planning with server-owned trace IDs, task IDs, timestamps, and status derivation.
- Independent graph verification before persistence; rejected or unavailable model drafts use a labeled deterministic fallback.

## Required before broader release

- App-owned accounts, optional MFA, and multi-user role administration if the product expands beyond owner-only Sites access.
- Encryption-at-rest key strategy and encrypted backup/restore tests.
- Docker execution sandbox with explicit network, filesystem, CPU, memory, and time budgets.
- Permission manifests and isolation for plugins.
- Prompt-injection and malicious-file defenses in the document pipeline.
- User-reviewed memory approval/deletion and a documented retention policy.

The current deployment relies on owner-only Sites authentication plus server-to-server service authentication. Broader sharing requires an explicit role and tenant authorization design before access is expanded.

The Ollama base URL and selected model are server-side environment settings. The model-assisted endpoint treats the goal as untrusted data, accepts only the planning schema, suppresses raw provider errors, and never exposes tool or execution fields. It remains separate from all tool-execution paths.
