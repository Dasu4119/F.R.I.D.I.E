# F.R.I.D.I.E. UX Contract

## Product context

- Audience: builders, researchers, and guided-workflow users.
- Primary jobs: submit a goal, inspect its decomposition, and understand what will happen next.
- Target market(s): global.
- Active locales: English (`en`).
- Language/content register and native-review policy: plain operational English; product review before release.
- Timezone/calendar policy: UTC for stored audit timestamps; browser locale for display.
- Accessibility target: WCAG 2.2 AA.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Permission model | `docs/security.md` + Phase 8 PDF | Security policy | 2026-08-30 |
| Data lifecycle | `docs/database.md` + Phase 5/6 PDFs | Data contract | 2026-08-30 |
| Deletion / retention | `docs/security.md` | Deferred policy | 2026-08-30 |
| Billing / payment | Not in v0.1 | Out of scope | 2026-08-30 |
| Legal / regulatory copy | `PRODUCT.md` | Product brief | 2026-08-30 |
| Market / content conventions | `DESIGN.md` | Design context | 2026-08-30 |

## Visual contract

- Project `DESIGN.md`: `DESIGN.md`.
- Token ownership model: existing runtime CSS is canonical.
- Runtime design-system/token source: `app/globals.css` and shared Shadcn primitives.
- Mapping/export/adapters: CSS semantic variables -> Tailwind v4 theme -> shared components.
- Token drift gate: DESIGN.md lint, premium static audit, lint, and build.
- Supported themes: light and dark via system preference.
- Design-context owner/review policy: update documentation and runtime tokens together.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | Goal composer in `app/page.tsx` using shared Textarea/Button | This contract | goal-submit | unit + build |
| Scrollbar | Global rules in `app/globals.css` | `DESIGN.md` | stable gutter | premium audit |
| Toast | Not used in v0.1; status remains inline | This contract | none | static audit |
| CRUD | Create/read run through `/api/orchestrate`; local API owns approval transition | `docs/architecture.md` | create/read/approve | contract + backend test |

## Component behavior

| Component | Default | Hover | Focus | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | labeled action | tone shift | visible ring | 1px translate | muted, noninteractive | stable spinner + label | inline status |
| Textarea | labeled goal | border shift | visible ring | n/a | read-only tone | stays editable only before submit | linked error text |
| Task list | readable records | none | links/buttons only | n/a | n/a | stable progress row | persistent retry panel |
| System readiness | capability + exact boundary | none | n/a | n/a | n/a | n/a | never upgrades local API readiness to live model connectivity |

## Dataset navigation

- Current task lists are bounded to one plan (maximum eight tasks) and render all.
- Approved device history renders at most 10 records. It is ordered newest first, has no search/paging, and is explicitly labeled browser-only.
- Empty state invites the user to submit a goal; error state preserves their goal and offers Retry.
- No selection or bulk actions exist in v0.1.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Create plan | `Divide this goal` | stable busy button + status | same command center | plan and trace appear | inline Retry; goal preserved | plan heading | `PRODUCT.md` |
| Retry plan | `Retry` | same pending state | same command center | refreshed trace | repeatable inline error | error/plan heading | `docs/architecture.md` |
| Approve plan | `Approve plan` | stable busy button | same command center | inline approved state + device history record | persistent inline storage error; no approval committed | approval control/status | Phase 8 + `docs/security.md` |
| Cancel/back | not applicable in v0.1 | n/a | n/a | n/a | n/a | n/a | `PRODUCT.md` |

## Navigation and responsive behavior

- Route document title policy: `{Page} — F.R.I.D.I.E.`; v0.1 root is `Command center — F.R.I.D.I.E.`.
- Route errors remain app-owned and keep a Home link when routes are added.
- In-page navigation uses real anchors for Command, History, Agents, and Activity.
- Below 900px the two-column grid becomes one column with the composer first.
- Focused controls use scroll margin and are never hidden by sticky UI.

## Overlays and feedback

- No modal, destructive, toast, tooltip-only, or unsaved-change flows exist in v0.1.
- Inline alerts are persistent until the next successful request.
- Layer order is header < future popover < future dialog < future toast.

## Async and resilience

- Mutations are pessimistic; success appears only after the API responds.
- Duplicate submits are blocked and each request uses an `AbortController`.
- Timeout/network/server errors preserve input and provide Retry.
- The hosted command center remains deterministic. Local model-assisted planning reports `ollama` or `deterministicFallback` in its API response and never hides a rejected/unavailable model draft.
- No offline queue, auto-save, multi-tab reconciliation, or authentication is claimed in v0.1.

## Validation

- Schema layer: Zod-compatible server checks in the route and Pydantic in FastAPI.
- Validate on submit, then clear on input.
- Errors are inline and associated through `aria-describedby`; the textarea receives focus.
- `noValidate`, duplicate-submit prevention, and failure recovery are mandatory.

## Permission and clipboard

- v0.1 is a local single-user slice. The `X-FRIDIE-User` header scopes development data but is not authentication. Authorization must be implemented before any shared deployment handles private user data.
- Trace IDs may be copied later; secrets never appear in the UI, URL, logs, or client storage.
- Browser storage receives only an explicitly approved plan summary: trace ID, objective, task count, confidence, and approval timestamp. It is capped at 10 records and is not called synchronized or durable server history.

## Verification

- Required commands: `npm run lint`, `npm run test:unit`, `npm run build`, `npm run verify:premium`, `python -m unittest discover`.
- Accessibility checks: semantic static audit plus keyboard/reduced-motion browser pass when requested.
- Canonical sibling flow: the goal Create and Retry flows share one status/error system.
- CRUD full-flow evidence: `tests/planner.test.mjs`, `tests/history.test.mjs`, and backend run tests.
- Failure-path evidence: UI route-error and invalid-goal tests.
