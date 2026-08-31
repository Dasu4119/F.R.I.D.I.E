# Local Model Adapter

F.R.I.D.I.E. includes an Ollama-compatible adapter behind the local FastAPI service. Ollama serves its local API at `http://localhost:11434/api` by default. The adapter uses `GET /api/tags` to discover installed models and `POST /api/generate` with `stream: false` and a JSON Schema `format` for bounded structured generation.

## Configuration

- `FRIDIE_OLLAMA_BASE_URL` — API host without the `/api` suffix. Docker Compose defaults to `http://host.docker.internal:11434`.
- `FRIDIE_OLLAMA_MODEL` — exact installed model name. Empty by default so readiness is never inferred.
- `FRIDIE_OLLAMA_TIMEOUT_SECONDS` — bounded request timeout, default 3 seconds.

The status endpoint is honest by construction:

- **Connected, not configured:** Ollama responded but no model was selected.
- **Connected, model missing:** the selected name is absent from `/api/tags`.
- **Ready:** Ollama responded and the exact selected model is installed.
- **Unreachable:** the local address did not respond successfully within the timeout.

## Verified planning route

`POST /api/v1/goals/model-assisted` attempts one structured local-model draft. The server owns identity and state fields, then verifies:

- 3–8 bounded tasks;
- a dependency-free planning/frame entry task;
- dependencies that reference earlier tasks only;
- at least one build task and one independently owned verification task;
- a final verification/deliver handoff that depends on that verification evidence;
- non-empty rationales and acceptance checks.

The response includes `route.source` as `ollama` or `deterministicFallback`, the selected model, safe issue codes, and a plain-language status. Invalid JSON, schema mismatches, invalid graphs, timeouts, missing configuration, or model failures use the deterministic planner. Raw provider errors are not returned.

This route creates plans only. It does not execute agents, tools, code, filesystem operations, or arbitrary network requests.
