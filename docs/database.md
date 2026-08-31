# MongoDB Data Contract

The product label remains **F.R.I.D.I.E.**. The MongoDB database is named **`FRIDIE`** because MongoDB database names cannot contain `/`, `\\`, `.`, spaces, quotes, `$`, or a null character across the supported Windows/Linux matrix.

## Collections

| Collection | Purpose | Primary indexes |
|---|---|---|
| `projects` | User-owned goal containers | `owner_id + updated_at` |
| `runs` | One orchestration result and approval state per submitted goal | unique `trace_id`, `project_id + created_at`, `owner_id + created_at` |
| `tasks` | Dependency-aware specialist work | unique `task_id`, `run_id + sequence` |
| `memories` | User-approved project knowledge | `project_id + status + updated_at` |
| `documents` | Imported-file metadata, never raw secrets | `project_id + sha256` |
| `audit_logs` | Append-only significant actions | `trace_id + occurred_at`, TTL optional by policy |

Indexes are created idempotently during API startup. Long-term memory requires `status: approved`; deterministic plans do not silently become memory.

Run approval changes `status` from `planned` to `approved`, records `approved_at`, and appends one `goal.plan.approved` audit event. The operation is idempotent for the same owner and trace ID. The development `owner_id` scope is not a substitute for authentication.

## Local defaults

- URI: `mongodb://mongodb:27017` inside Docker Compose.
- Database: `FRIDIE`.
- Development credentials come from `.env`; no credential is committed.
- Production requires authentication, TLS, backups, and an explicit retention policy.
