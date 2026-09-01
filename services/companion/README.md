# F.R.I.D.I.E. Local Companion

This Windows-only companion is the local trust boundary for application launches. It must run on
the user's PC and bind only to `127.0.0.1`. The cloud API never receives direct desktop authority.

1. Copy `applications.example.json` to `applications.json` and correct each executable path.
2. Generate a token with `python -c "import secrets; print(secrets.token_urlsafe(32))"`.
3. Store it as `FRIDIE_COMPANION_TOKEN`; never commit it.
4. Start with `uv run uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8765`.

Every launch uses two calls: create a short-lived launch request, show it to the user, then consume
the one-time approval. Arbitrary commands, shell arguments, remote binding, and background approval
are intentionally unsupported.
