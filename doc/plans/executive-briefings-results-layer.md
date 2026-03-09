# Executive Briefings, Results, and Planning Layer

## Summary

Paperclip V1 already has a strong control-plane and execution layer: goals, projects, issues, comments, approvals, runs, dashboard telemetry, and cost reporting. What it lacked was a durable interpretation layer that can answer executive questions directly.

This change adds that missing layer without widening the existing dashboard contract.

## Product Shape

Paperclip now has four explicit layers:

- Goals: what the company wants
- Plans: how the company intends to get there
- Work: issues, comments, approvals, runs
- Results: what actually changed

The dashboard remains the narrow operational telemetry surface.
The new `/briefings` surface becomes the executive board and durable record layer.

## Data Model

New tables:

- `records`
- `record_links`
- `record_attachments`
- `briefing_view_states`

`records` stores three categories:

- `plan`
- `result`
- `briefing`

Supported plan kinds:

- `strategy_memo`
- `project_brief`
- `decision_record`
- `operating_plan`
- `weekly_objective`
- `risk_register`

Supported result kinds:

- `deliverable`
- `finding`
- `blocker`
- `decision_outcome`
- `status_report`

Supported briefing kinds:

- `daily_briefing`
- `weekly_briefing`
- `executive_rollup`
- `project_status_report`
- `incident_summary`
- `board_packet`

`record_links` lets one durable output roll up many issues, approvals, runs, projects, goals, agents, or other records.
`record_attachments` links records to generic uploaded assets.
`briefing_view_states` persists the "since my last visit" board window on the server side per company, scope, and board user.

## API Surface

Company-scoped list/create endpoints:

- `GET /companies/:companyId/plans`
- `POST /companies/:companyId/plans`
- `GET /companies/:companyId/results`
- `POST /companies/:companyId/results`
- `POST /companies/:companyId/results/promote`
- `GET /companies/:companyId/briefings`
- `POST /companies/:companyId/briefings`
- `GET /companies/:companyId/briefings/board`

Shared record endpoints:

- `GET /records/:recordId`
- `PATCH /records/:recordId`
- `POST /records/:recordId/links`
- `POST /records/:recordId/attachments`
- `POST /records/:recordId/generate`
- `POST /records/:recordId/publish`

Asset uploads now include a general file route:

- `POST /companies/:companyId/assets/files`

The existing image-only routes and issue image attachments remain unchanged.

## Board Semantics

The executive board answers six questions directly:

- What outcomes landed?
- What is at risk or blocked?
- What needs a decision?
- Which projects are trending up or down?
- Where is money or token usage behaving strangely?
- What did each executive owner produce?

Board aggregation rules:

- `outcomesLanded`: published result records in scope since the selected window
- `risksAndBlocks`: active `risk_register` plans plus published `blocker` results
- `decisionsNeeded`: active `decision_record` plans with `decisionNeeded=true`
- `projectHealth`: latest published result plus blocker/decision context per project
- `costAnomalies`: high-token runs with truthful `pricingState` handling
- `executiveRollups`: latest published `executive_rollup` per executive scope

`pricingState` is explicit:

- `exact`
- `estimated`
- `unpriced`

If token-heavy runs do not have priceable cost data, the board shows `unpriced` instead of implying `$0.00`.

## UI Surface

New routes:

- `/briefings` -> redirects to `/briefings/board`
- `/briefings/board`
- `/briefings/results`
- `/briefings/plans`
- `/briefings/records/:recordId`

The sidebar now includes `Briefings` as a first-class destination.

The executive surface includes:

- Board view with scope picker and server-backed "since last visit" context
- Results library with filters by kind, status, project, and scope
- Plans library with the same durable filtering model
- Shared record detail page with markdown body, attachments, linked work, publish state, owner, and activity summary

Promotion entry points exist on:

- issue detail
- approval detail
- agent run detail

## Mutation and Audit Rules

Every record mutation writes to `activity_log`, including:

- create
- update
- generate
- publish
- promote to result
- link addition
- attachment addition

Company scoping is enforced on every record, link, attachment, and board query.

## Notes

This change does not replace the dashboard.
It adds the executive cognition layer beside it.

Automatic publishing into the future knowledge library is intentionally deferred until the broader knowledge subsystem lands.
