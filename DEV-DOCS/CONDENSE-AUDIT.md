# Condense Audit

Last updated: 2026-03-10

## 1. Objective

This audit identifies where Paperclip has grown harder to review, reason about, or evolve, and turns that into an implementation-ready backlog for safe simplification.

Scope rules for this audit:

- preserve runtime behavior, public APIs, schema semantics, and current comments that explain non-obvious logic
- treat generated output, binary assets, `dist/`, `node_modules/`, and migration snapshots as out of scope
- prefer extraction, indexing, and reclassification over renaming or semantic churn

This is a backlog document, not an implementation document.

## 2. Method and Scoring

### Thresholds used

- code files over `600` lines: manual review required
- code files over `1000` lines: automatic hotspot
- docs over `800` lines: manual review required
- shorter files were still flagged when they acted as multi-domain routers, broad barrels, or canonical overlap points

### Inventory summary

- Code scanned: `398` files across `server/src`, `ui/src`, `packages/shared/src`, and `packages/db/src`
- Docs scanned: `94` markdown files across `DEV-DOCS`, `doc`, and `docs`
- Code hotspots over `600` lines: `23`
- Code hotspots over `1000` lines: `13`
- Docs over `800` lines: `4`
- Additional manual docs review targets below threshold: `doc/spec/agent-runs.md`

### Score rubric

Each hotspot gets a `0-12` condensation score:

- Size pressure: `0-4`
- Responsibility sprawl: `0-3`
- Duplication or verbosity pressure: `0-2`
- Public-contract sensitivity: `0-3`

Interpretation:

- `10-12`: batch immediately
- `7-9`: batch soon after primary hotspots
- `4-6`: secondary cleanup only
- `0-3`: monitor, do not actively condense

## 3. Scored Hotspot Inventory

### 3.1 Server and Runtime

| Score | Lines | Target | Why it is flagged |
|---|---:|---|---|
| 12 | 2604 | `server/src/routes/access.ts` | One route file owns invites, join requests, board-claim flows, onboarding helpers, OpenClaw prompt generation, request-origin parsing, and file reads. |
| 12 | 2571 | `server/src/services/heartbeat.ts` | Wakeup coordination, workspace resolution, git helpers, run execution, session migration, and runtime-state concerns all live together. |
| 10 | 1517 | `server/src/routes/issues.ts` | Top-level issue lifecycle, attachments, comments, approvals, and mutating route enforcement are packed into one public route surface. |
| 10 | 1496 | `server/src/routes/agents.ts` | Agent CRUD, keys, runtime controls, env tests, and adapter-specific behavior are co-located in one route module. |
| 10 | 1451 | `server/src/services/issues.ts` | Transition rules, unread/touched logic, labels, active runs, and checkout release semantics are bundled into one service. |
| 9 | 1661 | `server/src/services/records.ts` | The record subsystem mixes board summaries, schedule math, hydration, portfolio rollups, and record CRUD in one service. |
| 8 | 1018 | `server/src/services/company-portability.ts` | Slugging, YAML/frontmatter rendering, GitHub fetching, env normalization, portability manifests, and import/export logic are combined. |
| 7 | 800 | `server/src/services/projects.ts` | Goal linking, workspace normalization, milestone hydration, uniqueness, and primary-workspace rules share one module. |
| 6 | 679 | `server/src/services/agents.ts` | Mostly cohesive, but config revisioning, token hashing, manager planning mode resolution, and patch handling could be separated. |
| 6 | 673 | `server/src/index.ts` | Startup wiring is valid, but migration prompting, local board bootstrap, and server bootstrapping are all mixed into the process entrypoint. |

### 3.2 UI

| Score | Lines | Target | Why it is flagged |
|---|---:|---|---|
| 12 | 2660 | `ui/src/pages/AgentDetail.tsx` | One page contains multiple tabs, run detail rendering, config summary, live-run views, env redaction helpers, charts, and action plumbing. |
| 11 | 1543 | `ui/src/pages/Briefings.tsx` | Board view, library views, record composer, results/plans views, and portfolio rendering all sit in one large page file. |
| 10 | 1421 | `ui/src/components/AgentConfigForm.tsx` | Create/edit flows, adapter dropdowns, model selection, env editing, thinking controls, and env-test rendering are bundled into one form component. |
| 9 | 1225 | `ui/src/components/OnboardingWizard.tsx` | Company creation, CEO hiring, task seeding, adapter testing, and wizard presentation are handled by one component. |
| 9 | 1032 | `ui/src/pages/IssueDetail.tsx` | Activity, records, comments, metrics, and identity formatting live in one page with many page-local helpers. |
| 8 | 968 | `ui/src/components/NewIssueDialog.tsx` | Draft persistence, assignee adapter overrides, company/project/goal wiring, and modal UI are tightly coupled. |
| 8 | 948 | `ui/src/pages/Inbox.tsx` | Approvals, join requests, stale work, failed runs, dismiss state, and retry flows are all rendered from one page module. |
| 7 | 1330 | `ui/src/pages/DesignGuide.tsx` | Large, but mostly static design-system reference content. This is a readability issue more than runtime risk. |
| 7 | 756 | `ui/src/components/IssuesList.tsx` | Filtering, sorting, saved view state, presets, and list rendering are fused together. |
| 6 | 686 | `ui/src/pages/RecordDetail.tsx` | Detail rendering is manageable but still mixes link resolution, actor rendering, and record activity presentation. |
| 6 | 626 | `ui/src/components/MarkdownEditor.tsx` | Mention detection, style helpers, editor behavior, and suggestion rendering are in one component. |
| 6 | 625 | `ui/src/components/LiveRunWidget.tsx` | Polling, transcript parsing, stdout/stderr normalization, and live-feed rendering are tightly coupled. |

### 3.3 Shared and Data Contracts

| Score | Lines | Target | Why it is flagged |
|---|---:|---|---|
| 7 | 736 | `packages/db/src/client.ts` | Migration discovery, manual fallback migration execution, schema quoting, and DB creation share one contract-heavy file. |
| 6 | 365 | `packages/shared/src/index.ts` | The top-level barrel is wide enough to amplify churn and make contract ownership harder to trace even though it is not oversized by lines. |
| 5 | 332 | `packages/shared/src/constants.ts` | Central enum registry is cohesive, but new domain constants keep accumulating without grouped ownership notes. |
| 5 | 180 | `packages/shared/src/validators/index.ts` | Broad validator barrel increases re-export sprawl and makes per-domain validation entrypoints less obvious. |

### 3.4 Docs and Specs

| Score | Lines | Target | Why it is flagged |
|---|---:|---|---|
| 10 | 1617 | `doc/plugins/PLUGIN_SPEC.md` | Very detailed future-state spec that overlaps with research and likely wants indexing or appendices rather than one monolith. |
| 9 | 1738 | `doc/plugins/ideas-from-opencode.md` | Valuable research, but highly verbose and overlaps substantially with the plugin spec. Best treated as historical reference. |
| 9 | 1011 | `doc/spec/ui.md` | Canonical UI design spec, but it still uses pre-roadmap terminology and repeats information already summarized elsewhere. |
| 8 | 888 | `doc/SPEC-implementation.md` | Canonical V1 build contract; large by design, but several detailed sections duplicate lower-level subsystem docs. |
| 7 | 756 | `doc/spec/agent-runs.md` | Below the doc threshold, but it overlaps heavily with `SPEC-implementation.md` and `DEV-DOCS/ARCHITECTURE.md` on runtime behavior. |

## 4. Docs Overlap Map

| Document | Classification | Keep as source of truth for | Main overlap | Condense action |
|---|---|---|---|---|
| `doc/SPEC-implementation.md` | Canonical | V1 behavior and release contract | `doc/spec/ui.md`, `doc/spec/agent-runs.md`, `DEV-DOCS/ARCHITECTURE.md` | Keep intact; remove duplicated subsystem rationale only when lower-level docs are clearly linked. |
| `doc/spec/ui.md` | Canonical | Detailed UI design target | `SPEC-implementation.md`, `DEV-DOCS/ARCHITECTURE.md` | Keep as detailed spec; update roadmap terminology and split only appendices or repetitive sections later. |
| `doc/spec/agent-runs.md` | Canonical subsystem spec | Runtime and adapter protocol | `SPEC-implementation.md`, `DEV-DOCS/ARCHITECTURE.md` | Keep runtime detail here; trim duplicated baseline/gap prose after adding stronger cross-links. |
| `DEV-DOCS/ARCHITECTURE.md` | Canonical current-state doc | What the code does today | `SPEC-implementation.md`, `doc/spec/agent-runs.md`, `doc/spec/ui.md` | Keep concise and implementation-oriented; do not let it absorb full product spec detail. |
| `doc/plugins/PLUGIN_SPEC.md` | Canonical future-state spec | Post-V1 plugin architecture | `doc/plugins/ideas-from-opencode.md` | Keep as the target design; move comparative analysis into an appendix or archive note. |
| `doc/plugins/ideas-from-opencode.md` | Historical reference | Comparative research and rationale | `doc/plugins/PLUGIN_SPEC.md` | Mark as research appendix or archive candidate; shorten the executive summary and link to the spec. |
| `doc/plans/*` and `doc/plan/*` | Historical reference | Implementation history and design drafts | Current specs and DEV-DOCS | Add status banners or an index so readers stop treating them as live requirements. |
| `docs/api/*`, `docs/deploy/*`, `docs/start/*` | Active supporting docs | External-facing usage and deployment guidance | `doc/*` high-level specs | Keep; dedupe by adding direct links back to canonical spec sections instead of repeating rationale. |

## 5. Explicit Do-Not-Condense Notes

These files are large or central, but the current size is mostly justified. They should only get light indexing, comments, or extraction of pure helpers.

### `packages/shared/src/constants.ts`

- Why not to condense aggressively: this is the canonical enum and literal registry for the monorepo
- Safe move only: group by domain with section comments or segmented re-export files

### `packages/db/src/client.ts`

- Why not to condense aggressively: migration safety and DB bootstrap behavior are contract-heavy and easy to break
- Safe move only: extract pure migration helpers without changing call order or fallback semantics

### `doc/SPEC-implementation.md`

- Why not to condense aggressively: it is the release contract for V1
- Safe move only: add links, indexes, and references to subsystem docs instead of deleting authoritative detail

### `doc/spec/ui.md`

- Why not to condense aggressively: it is the most complete UI contract in the repo
- Safe move only: update terminology and move clearly historical sections into supporting docs

### `doc/spec/agent-runs.md`

- Why not to condense aggressively: it carries the runtime protocol details that lower-level implementation docs should not duplicate
- Safe move only: trim duplicated baseline narrative after cross-linking the authoritative sections

## 6. Ranked Backlog

### Batch 1: High-Risk Server Condensation

Review first:

1. `server/src/routes/access.ts`
2. `server/src/services/heartbeat.ts`
3. `server/src/routes/issues.ts`
4. `server/src/routes/agents.ts`
5. `server/src/services/issues.ts`
6. `server/src/services/company-portability.ts`

Audit questions:

- Which functions are pure normalization/helpers and can move without changing route signatures?
- Which permission checks or company-scoping rules are duplicated and should become one shared helper?
- Which route handlers are large only because response shaping lives inline?
- Which service helpers are cross-cutting enough to deserve their own domain submodule?

Expected safe moves:

- split route-private helper families into domain submodules
- extract pure parsing/normalization code before moving any mutating orchestration
- leave route registration and public path definitions in place for the first pass
- add narrow unit tests around extracted helpers before attempting route re-shaping

Verification if implemented:

- route integration tests for affected endpoints
- focused unit tests for extracted pure helpers
- `pnpm --filter @paperclipai/server test:run`
- `pnpm -r typecheck`

#### 1. `server/src/routes/access.ts`

- Category: `split`
- Why it is oversized or noisy: invites, join requests, board claims, onboarding prompt generation, request-origin parsing, and skill-file loading all live in one route file.
- What should stay intact: existing `/api/access` paths, invite token semantics, join-request compatibility, and current permission checks.
- Proposed safe condensation: extract `invites`, `join-requests`, `request-origin`, and `openclaw` helper modules under `server/src/routes/access/` or `server/src/services/access/`, leaving the route file as thin wiring.
- Expected payoff: smaller security review surface and easier onboarding-flow maintenance.
- Verification needed: integration tests for invite and join-request routes plus unit tests for normalization helpers.
- Risk level: `high`

#### 2. `server/src/services/heartbeat.ts`

- Category: `split`
- Why it is oversized or noisy: the module mixes wakeup request handling, adapter invocation, workspace resolution, git command helpers, runtime-state migration, and run-log coordination.
- What should stay intact: wakeup semantics, adapter API, session-resume behavior, checkout resolution order, and event publishing.
- Proposed safe condensation: extract `workspace-resolution`, `wakeup-context`, `session-migration`, and `git-helpers` modules under `server/src/services/heartbeat/`, then reduce the top-level file to orchestration.
- Expected payoff: lower regression risk when changing runtime behavior and clearer test seams for workspace and session logic.
- Verification needed: focused heartbeat tests for workspace selection, session carry-forward, queueing, and cancellation paths.
- Risk level: `high`

#### 3. `server/src/routes/issues.ts`

- Category: `split`
- Why it is oversized or noisy: issue CRUD, comments, attachments, approval linking, and approval-enforcement logic are all mixed in one public route surface.
- What should stay intact: current route paths, approval enforcement semantics, attachment validation, and company scoping.
- Proposed safe condensation: move comments, attachments, and approval-link handlers into dedicated issue-route modules while keeping one root router registration file.
- Expected payoff: easier review of governance-sensitive issue mutations.
- Verification needed: route coverage for top-level issue creation, attachments, comments, and approval-linking.
- Risk level: `high`

#### 4. `server/src/routes/agents.ts`

- Category: `split`
- Why it is oversized or noisy: CRUD, key management, wakeup actions, adapter testing, and configuration-specific branching are all in one file.
- What should stay intact: route paths, agent auth controls, env-test responses, and activity logging.
- Proposed safe condensation: split into `agent-crud`, `agent-keys`, `agent-runtime`, and `agent-config-tests` handler modules behind the same router factory.
- Expected payoff: less route sprawl and cleaner ownership of agent lifecycle vs runtime controls.
- Verification needed: route tests for create/update agent, key creation/revocation, wakeup/reset, and adapter env tests.
- Risk level: `high`

#### 5. `server/src/services/issues.ts`

- Category: `extract`
- Why it is oversized or noisy: issue transitions, user-context queries, labels, active-run decoration, and checkout release logic are bundled together.
- What should stay intact: current transition rules, unread state semantics, and checkout release behavior.
- Proposed safe condensation: extract `issue-transitions`, `issue-user-context`, and `issue-checkout-release` helpers while preserving the public `issueService(db)` shape.
- Expected payoff: sharper boundaries between state-machine logic and query composition.
- Verification needed: existing issue transition tests plus new helper-level coverage for unread and release decisions.
- Risk level: `high`

#### 6. `server/src/services/company-portability.ts`

- Category: `split`
- Why it is oversized or noisy: manifest normalization, GitHub fetching, frontmatter rendering, YAML serialization, and import/export orchestration all live together.
- What should stay intact: manifest schema, exported markdown format, collision behavior, and secret-handling rules.
- Proposed safe condensation: separate `portable-config`, `markdown-frontmatter`, `github-fetch`, and `portability-slugging` helpers into a portability subfolder.
- Expected payoff: easier reasoning about portability format changes without touching network and serialization code at the same time.
- Verification needed: export/import tests, snapshot tests for markdown/frontmatter rendering, and portability preview coverage.
- Risk level: `medium-high`

### Batch 2: High-Friction UI Condensation

Review first:

1. `ui/src/pages/AgentDetail.tsx`
2. `ui/src/components/AgentConfigForm.tsx`
3. `ui/src/pages/Briefings.tsx`
4. `ui/src/components/OnboardingWizard.tsx`
5. `ui/src/components/NewIssueDialog.tsx`
6. `ui/src/pages/IssueDetail.tsx`

Audit questions:

- Which page-local helpers should move to shared hooks or view components?
- Which tabs or sections are independent enough to become child routes or subcomponents?
- Which query/mutation groups are repeated across adjacent views?
- Which presentation-only sections are obscuring the main control flow?

Expected safe moves:

- extract tab content into dedicated components without changing route shape
- move draft persistence and query wiring into custom hooks
- isolate adapter-specific UI controls from common form shells
- keep existing props contracts stable until after extraction

Verification if implemented:

- UI component tests for extracted sections
- route rendering tests for major page tabs
- `pnpm --filter @paperclipai/ui test:run`
- `pnpm -r typecheck`

#### 1. `ui/src/pages/AgentDetail.tsx`

- Category: `split`
- Why it is oversized or noisy: the page contains overview, configuration, runs, charts, env formatting, transcript helpers, and nested action flows.
- What should stay intact: route behavior, tab semantics, query keys, and live-run operator controls.
- Proposed safe condensation: break the page into `AgentOverviewTab`, `AgentConfigureTab`, `AgentRunsTab`, and run-detail support components plus a small `agent-detail-helpers.ts`.
- Expected payoff: easier code review and isolated test coverage for each tab.
- Verification needed: page-level tests for tab switching, run detail rendering, and config actions.
- Risk level: `high`

#### 2. `ui/src/components/AgentConfigForm.tsx`

- Category: `split`
- Why it is oversized or noisy: core form controls, adapter-specific controls, environment editing, env testing, and model/thinking controls are mixed together.
- What should stay intact: submit payload shape, validation semantics, and current adapter-specific affordances.
- Proposed safe condensation: extract adapter-specific config sections and shared form controls into smaller components, leaving one orchestrating form shell.
- Expected payoff: easier addition of future adapters and less accidental coupling between adapter UIs.
- Verification needed: form tests for create/update mode, env-test rendering, and adapter-specific payload generation.
- Risk level: `high`

#### 3. `ui/src/pages/Briefings.tsx`

- Category: `split`
- Why it is oversized or noisy: board, plans, results, portfolio, composer, and record-list rendering all live in one file.
- What should stay intact: route modes, current query behavior, and record composition flows.
- Proposed safe condensation: split mode-specific views into `briefings/` subcomponents and move shared list/composer helpers beside them.
- Expected payoff: easier evolution of each executive surface without re-reading the whole page.
- Verification needed: rendering tests for each mode and regression coverage for composer state.
- Risk level: `medium-high`

#### 4. `ui/src/components/OnboardingWizard.tsx`

- Category: `split`
- Why it is oversized or noisy: onboarding state machine, adapter testing, CEO seed task data, and UI steps are tightly coupled.
- What should stay intact: onboarding order, default CEO task seed, and success/failure behavior.
- Proposed safe condensation: extract step components plus a `useOnboardingWizardState` hook, keeping the existing wizard entrypoint.
- Expected payoff: easier bug-fixing in step transitions and better reuse of adapter-test UI.
- Verification needed: wizard step tests and happy-path onboarding coverage.
- Risk level: `medium-high`

#### 5. `ui/src/components/NewIssueDialog.tsx`

- Category: `extract`
- Why it is oversized or noisy: draft persistence, field defaults, assignee adapter overrides, and dialog rendering are all entangled.
- What should stay intact: payload shape, local draft key semantics, and current field defaults.
- Proposed safe condensation: move draft persistence and assignee-adapter override building into hooks/utilities, leaving the dialog focused on layout and mutation wiring.
- Expected payoff: cleaner issue-creation surface and simpler testing around override rules.
- Verification needed: component tests for draft restore/save, override payloads, and create mutation behavior.
- Risk level: `medium`

#### 6. `ui/src/pages/IssueDetail.tsx`

- Category: `split`
- Why it is oversized or noisy: activity formatting, metrics helpers, related-record rendering, and issue-detail presentation all live together.
- What should stay intact: route behavior, sidebar/detail composition, and activity semantics.
- Proposed safe condensation: extract `IssueActivityFeed`, `IssueMetricsPanel`, and issue-detail helper utilities.
- Expected payoff: smaller page reviews and clearer separation between data shaping and rendering.
- Verification needed: issue detail rendering tests and activity-feed regression coverage.
- Risk level: `medium`

### Batch 3: Shared-Contract Condensation

Review first:

1. `packages/shared/src/index.ts`
2. `packages/shared/src/constants.ts`
3. `packages/shared/src/validators/index.ts`
4. `packages/db/src/client.ts`

Audit questions:

- Which exports are truly cross-domain vs convenience re-exports?
- Which validator and constant groupings need domain-level entrypoints?
- Which DB helpers are pure enough to move without changing migration semantics?
- Where would extraction improve ownership without increasing import churn?

Expected safe moves:

- introduce segmented export files before shrinking any public barrel
- keep the top-level barrel for compatibility, but re-export from smaller domain barrels
- extract pure migration helpers only, not connection bootstrapping order

Verification if implemented:

- `pnpm -r typecheck`
- shared package tests
- DB migration state tests if `packages/db/src/client.ts` changes

#### 1. `packages/shared/src/index.ts`

- Category: `extract`
- Why it is oversized or noisy: one barrel re-exports nearly every constant, type, and validator, which hides domain ownership.
- What should stay intact: current import compatibility for consumers across server and UI.
- Proposed safe condensation: add domain barrels like `shared/agents`, `shared/issues`, `shared/records`, and have the root barrel re-export them for compatibility.
- Expected payoff: better contract discoverability without a breaking change.
- Verification needed: repo-wide typecheck and any package tests that import from `@paperclipai/shared`.
- Risk level: `medium`

#### 2. `packages/shared/src/constants.ts`

- Category: `trim`
- Why it is oversized or noisy: constants are cohesive, but they are accumulating without explicit domain section ownership.
- What should stay intact: every literal union and exported type alias.
- Proposed safe condensation: add domain grouping comments and optional segmented constant files, while keeping the existing top-level export surface.
- Expected payoff: easier maintenance without contract churn.
- Verification needed: repo-wide typecheck only.
- Risk level: `low`

#### 3. `packages/shared/src/validators/index.ts`

- Category: `dedupe`
- Why it is oversized or noisy: the broad validator barrel encourages wide imports and makes validator ownership diffuse.
- What should stay intact: schema names and current imports.
- Proposed safe condensation: introduce per-domain validator entrypoints and keep the top-level barrel as a compatibility wrapper.
- Expected payoff: cleaner import paths and lower chance of accidental validator entanglement.
- Verification needed: repo-wide typecheck and any validation tests.
- Risk level: `low-medium`

#### 4. `packages/db/src/client.ts`

- Category: `extract`
- Why it is oversized or noisy: migration discovery, journal ordering, manual fallback execution, and DB creation all share one file.
- What should stay intact: migration ordering, fallback behavior, and connection configuration.
- Proposed safe condensation: extract pure migration helpers into `packages/db/src/migrations/` while keeping `createDb`, `ensureDatabaseSchema`, and migration entrypoints stable.
- Expected payoff: safer DB client reviews and clearer test coverage around migration logic.
- Verification needed: DB package tests plus repo-wide typecheck.
- Risk level: `medium-high`

### Batch 4: Documentation Condensation

Review first:

1. `doc/spec/ui.md`
2. `doc/SPEC-implementation.md`
3. `doc/spec/agent-runs.md`
4. `doc/plugins/PLUGIN_SPEC.md`
5. `doc/plugins/ideas-from-opencode.md`
6. `doc/plans/*` and `doc/plan/*`

Audit questions:

- Which doc is authoritative for each subsystem?
- Which duplicated sections are summary material that should become links instead?
- Which historical plans still look active because they lack status banners?
- Which operator-facing docs are still using retired terminology like "Goals" in places that now mean "Roadmap"?

Expected safe moves:

- add "document role" banners and cross-links instead of deleting detailed spec content first
- classify historical plans explicitly
- consolidate repeated plugin rationale into the canonical plugin spec and downgrade the research doc to reference status
- keep DEV-DOCS focused on current implementation state, not future-state design

Verification if implemented:

- manual doc link check
- terminology sweep with `rg "Goals|goals"` and similar targeted searches
- spot-check rendered markdown if tables or anchors change

#### 1. `doc/spec/ui.md`

- Category: `merge`
- Why it is oversized or noisy: it is exhaustive and still contains terminology drift relative to the shipped roadmap surface.
- What should stay intact: the detailed UI contract and layout decisions.
- Proposed safe condensation: update nomenclature, move repeated implementation-priority notes into a lighter appendix, and cross-link to current DEV-DOCS architecture where appropriate.
- Expected payoff: lower confusion between shipped roadmap language and historical goals wording.
- Verification needed: terminology search and manual doc review.
- Risk level: `medium`

#### 2. `doc/SPEC-implementation.md`

- Category: `trim`
- Why it is oversized or noisy: some subsystem sections repeat detail now carried more concretely in lower-level specs.
- What should stay intact: all V1 scope, invariants, and acceptance criteria.
- Proposed safe condensation: replace duplicated explanatory prose with references to the more detailed runtime and UI specs while preserving the authoritative decision points.
- Expected payoff: a tighter release contract that is easier to audit.
- Verification needed: manual review to ensure no contract detail is lost.
- Risk level: `medium-high`

#### 3. `doc/spec/agent-runs.md`

- Category: `dedupe`
- Why it is oversized or noisy: baseline, gap, and implementation-plan prose overlaps with both the implementation spec and the architecture doc.
- What should stay intact: adapter protocol, wakeup semantics, persistence contract, and runtime requirements.
- Proposed safe condensation: keep protocol and runtime details, trim overlapping implementation-plan narrative, and cross-link to `SPEC-implementation.md`.
- Expected payoff: clearer runtime source of truth.
- Verification needed: manual doc review.
- Risk level: `medium`

#### 4. `doc/plugins/PLUGIN_SPEC.md`

- Category: `trim`
- Why it is oversized or noisy: the future-state plugin spec is deep enough that appendices and explicit reference sections would improve navigation.
- What should stay intact: canonical post-V1 plugin architecture.
- Proposed safe condensation: split comparative rationale and large examples into appendices or linked reference docs without changing normative sections.
- Expected payoff: easier future plugin work without losing architectural depth.
- Verification needed: manual link and anchor review.
- Risk level: `medium`

#### 5. `doc/plugins/ideas-from-opencode.md`

- Category: `archive`
- Why it is oversized or noisy: large research report that now duplicates parts of the plugin spec and can mislead readers into treating comparative notes as current design.
- What should stay intact: the research findings and references.
- Proposed safe condensation: mark as historical research, add a short front summary, and direct active readers to `PLUGIN_SPEC.md`.
- Expected payoff: lower doc confusion around plugin direction.
- Verification needed: manual doc review only.
- Risk level: `low`

#### 6. `doc/plans/*` and `doc/plan/*`

- Category: `archive`
- Why it is oversized or noisy: implementation drafts and historical plans remain intermingled with active specs.
- What should stay intact: the historical record of design decisions and execution plans.
- Proposed safe condensation: add an index or status banner that marks each as historical, superseded, or still active.
- Expected payoff: fewer false leads during future implementation work.
- Verification needed: manual scan of referenced plans.
- Risk level: `low`

### Batch 5: Secondary Cleanup

Review first:

1. `server/src/services/records.ts`
2. `ui/src/pages/Inbox.tsx`
3. `ui/src/pages/DesignGuide.tsx`
4. `ui/src/components/IssuesList.tsx`
5. `ui/src/pages/RecordDetail.tsx`
6. `ui/src/components/MarkdownEditor.tsx`
7. `ui/src/components/LiveRunWidget.tsx`
8. `server/src/services/projects.ts`
9. `server/src/services/agents.ts`
10. `server/src/index.ts`

Audit questions:

- Is the size causing review pain, or is the file merely detailed but cohesive?
- Would splitting introduce better ownership, or only more files with no real boundary?
- Can static reference content move to data files or subcomponents without making navigation worse?

Expected safe moves:

- extract pure helpers and static content first
- avoid splitting cohesive orchestration unless there is a stable domain boundary
- treat design-guide and documentation-style pages as lower urgency than runtime surfaces

Verification if implemented:

- focused unit/component tests
- route smoke tests if startup or server bootstrap changes
- repo-wide typecheck

#### 1. `server/src/services/records.ts`

- Category: `split`
- Why it is oversized or noisy: CRUD, hydration, board summaries, portfolio rollups, and schedule math are all in one service.
- What should stay intact: current record APIs and board-summary outputs.
- Proposed safe condensation: split `record-hydration`, `record-briefings`, and `record-board-summary` helpers under a `records/` service folder.
- Expected payoff: easier executive-surface changes without reopening all record internals.
- Verification needed: records service tests and board-summary regression coverage.
- Risk level: `medium-high`

#### 2. `ui/src/pages/Inbox.tsx`

- Category: `split`
- Why it is oversized or noisy: multiple inbox categories plus dismiss-state and retry actions are merged into one page file.
- What should stay intact: current tab/filter behavior and retry affordances.
- Proposed safe condensation: extract per-category cards and a small inbox-state hook.
- Expected payoff: easier UX iteration on inbox categories.
- Verification needed: page rendering tests and retry-flow coverage.
- Risk level: `medium`

#### 3. `ui/src/pages/DesignGuide.tsx`

- Category: `trim`
- Why it is oversized or noisy: mostly static reference content that can be segmented for readability.
- What should stay intact: the design system guidance itself.
- Proposed safe condensation: move sections into smaller presentational components or data-driven section maps.
- Expected payoff: easier editing of design tokens and examples.
- Verification needed: visual smoke check only.
- Risk level: `low`

#### 4. `ui/src/components/IssuesList.tsx`

- Category: `extract`
- Why it is oversized or noisy: filter state persistence and list rendering share one component.
- What should stay intact: current filtering and sorting behavior.
- Proposed safe condensation: move list-state helpers into a hook and extract filter controls from row rendering.
- Expected payoff: simpler list maintenance and easier testing.
- Verification needed: component tests for filter behavior.
- Risk level: `medium`

#### 5. `ui/src/pages/RecordDetail.tsx`

- Category: `extract`
- Why it is oversized or noisy: helper functions for actor/link/action formatting clutter the page body.
- What should stay intact: current detail route and activity semantics.
- Proposed safe condensation: move helper formatters into a nearby utility module and extract the activity section.
- Expected payoff: leaner page file with minimal risk.
- Verification needed: record detail render tests.
- Risk level: `low-medium`

#### 6. `ui/src/components/MarkdownEditor.tsx`

- Category: `extract`
- Why it is oversized or noisy: mention parsing, styling helpers, and editor behaviors share one component.
- What should stay intact: mention syntax and current editor affordances.
- Proposed safe condensation: extract mention parsing/styling helpers plus suggestion list rendering.
- Expected payoff: easier future editor bug fixes.
- Verification needed: editor mention tests.
- Risk level: `medium`

#### 7. `ui/src/components/LiveRunWidget.tsx`

- Category: `extract`
- Why it is oversized or noisy: transcript parsing and live polling logic are embedded directly in the widget.
- What should stay intact: live-feed behavior and persisted log parsing semantics.
- Proposed safe condensation: move parsing into dedicated helpers and isolate polling state in a hook.
- Expected payoff: easier live-run debugging and testability.
- Verification needed: component tests for feed parsing and polling behavior.
- Risk level: `medium`

#### 8. `server/src/services/projects.ts`

- Category: `extract`
- Why it is oversized or noisy: goal-link synchronization, workspace normalization, and milestone hydration live together.
- What should stay intact: current project payload shape and primary-workspace rules.
- Proposed safe condensation: extract workspace normalization and goal-link helpers while keeping `projectService(db)` stable.
- Expected payoff: cleaner project service maintenance.
- Verification needed: project service tests and repo-wide typecheck.
- Risk level: `low-medium`

#### 9. `server/src/services/agents.ts`

- Category: `extract`
- Why it is oversized or noisy: config revisioning and planning-mode resolution sit alongside token handling and CRUD helpers.
- What should stay intact: current agent payloads and revision semantics.
- Proposed safe condensation: separate config revision helpers from key/token utilities.
- Expected payoff: easier future manager-governance and adapter-config work.
- Verification needed: agent service tests and typecheck.
- Risk level: `low-medium`

#### 10. `server/src/index.ts`

- Category: `trim`
- Why it is oversized or noisy: entrypoint wiring contains extra migration prompting and local board bootstrap detail.
- What should stay intact: startup order and migration safety behavior.
- Proposed safe condensation: extract startup helper modules for migrations and local-trusted bootstrap, but keep one obvious entrypoint.
- Expected payoff: easier startup-path review.
- Verification needed: server startup smoke tests and typecheck.
- Risk level: `medium`

## 7. Batch 1 Next Steps

These steps are intentionally concrete enough to turn into implementation tickets without another design pass.

### Ticket 1: Condense `server/src/routes/access.ts`

- Create `server/src/routes/access/` with:
  - `invite-helpers.ts`
  - `join-request-normalization.ts`
  - `request-origin.ts`
  - `openclaw-onboarding.ts`
- Move only pure helpers first.
- Keep `access.ts` as the only router registration file.
- Add helper-level tests before touching handler bodies.

### Ticket 2: Condense `server/src/services/heartbeat.ts`

- Create `server/src/services/heartbeat/` with:
  - `workspace-resolution.ts`
  - `session-migration.ts`
  - `wakeup-context.ts`
  - `git-helpers.ts`
- Leave the service entrypoint and adapter invocation order unchanged.
- Add focused tests around extracted workspace and session helpers before further splitting orchestration.

### Ticket 3: Condense `server/src/routes/issues.ts`

- Create `server/src/routes/issues/` with handler modules for:
  - issue core CRUD
  - comments
  - attachments
  - approval linking and approval-required enforcement
- Keep `issueRoutes(db, storage)` as the route assembly function.
- Preserve all current route paths and request/response payloads.

### Ticket 4: Condense `server/src/routes/agents.ts`

- Create `server/src/routes/agents/` with handler modules for:
  - CRUD
  - keys
  - runtime actions
  - adapter environment tests
- Keep shared authorization and activity logging helpers centralized.
- Add route tests per module boundary before any UI follow-up.

### Ticket 5: Condense `server/src/services/issues.ts`

- Extract:
  - `issue-transitions.ts`
  - `issue-user-context.ts`
  - `issue-checkout-release.ts`
- Keep `issueService(db)` and exported helper names stable wherever possible.
- Add helper-level unit coverage for transition assertions and checkout release decisions.

### Ticket 6: Condense `server/src/services/company-portability.ts`

- Create `server/src/services/company-portability/` with:
  - `portable-config.ts`
  - `frontmatter.ts`
  - `github-fetch.ts`
  - `slugging.ts`
- Preserve markdown output shape and manifest compatibility.
- Snapshot-test markdown/frontmatter output before and after extraction.

## 8. Bottom Line

The repo does not need a broad rewrite. It needs methodical decomposition of a small set of high-pressure runtime and UI files, followed by a documentation pass that clarifies which specs are canonical and which are historical reference.

The highest-value next move is Batch 1. It has the clearest review-payoff-to-risk ratio and reduces the chance that future feature work keeps stacking onto already overloaded server modules.
