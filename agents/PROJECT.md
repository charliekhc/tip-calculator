# PROJECT.md — the only file you fill in per project

- **Kit version used:** 1.6.0 <!-- from agents/README.md; tells you which master changes this project hasn't picked up -->

Every project fact lives here and nowhere else. The role files (`roles/`) and the
guardrail packs (`guardrails/`) never change between projects; they read this file.

`setup` fills this file with you. Every double-braced field must end up resolved: a real value,
`none` for an optional field, or `pending scaffold` for a command that doesn't exist yet. A completed
setup leaves no double braces anywhere in this file.

---

## 1. Identity

- **Project name:** Tip calculator API
- **What it is (one sentence):** An HTTP API with one endpoint, `POST /split`, that takes a bill in cents, a tip percentage and a number of people, and returns what each person pays.
- **Target users / segment:** A single user; no login, no database <!-- reviewer uses this to catch scope creep -->
- **Markets / currencies / locales:** USD only (exponent 2); no locales
- **Owner (final approver, merges PRs):** Charlie
- **Builder role name:** Claude <!-- the agent that writes code; follows roles/builder.md -->
- **Reviewer role name:** Reviewer (GPT-6) <!-- the agent that reviews; follows roles/reviewer.md -->

## 2. Sources of truth

| What | Path | Wins over |
|---|---|---|
| Product spec / proposal (latest) | docs/specs/2026-10-01-tip-calculator-design.md | everything except the owner |
| Spec hash at last reconcile | ee3c51544413a45c581a9dc1ce15a8231a66836a <!-- git hash-object of the spec when setup last filled this file --> | |
| Decisions log (committed) | docs/DECISIONS.md | handoff, chat history |
| Durable notes (other lasting facts) | none <!-- e.g. tool memory folder, or docs/NOTES.md --> | handoff, chat history |
| Review files | `.agent/reviews/` (reviewer writes, builder reads; local only — the final round is copied into each PR log) | |
| In-flight task state (handoff) | .agent/handoff.md | nothing — repo wins for code state |
| Extra frontend standard (on top of `guardrails/frontend.md`) | none <!-- or "none" --> | |
| Other standards | none | |
| Notes the reviewer must always load | none | |
| Extra in-flight files (checklists, cutover plans) | none | |

**Conflict rule:** repo state wins for *what the code is*. Handoff wins for *what we were doing*.
Spec wins for *what we should build*. If two of these disagree, stop and ask Charlie.

## 3. Paths and layout

- **Project root:** .
- **Repo root:** . <!-- same as project root, or a subfolder like app/ -->
- **Code must live under:** `src/` (tests in `test/`)
- **Layout:**
  - `src/` — application code (`src/money/`, `src/http/`, `src/json/`, `src/config/`)
  - `config/` — `config/app.json`, the only place for business values
  - `test/` — Vitest tests
  - `docs/` — spec, decisions log, runbooks
  - `agents/` — the agent kit
- **Specs:** docs/specs/YYYY-MM-DD-<topic>-design.md <!-- default: docs/specs -->
- **Per-PR plans:** docs/plans/YYYY-MM-DD-<topic>.md
- **Per-PR logs:** one file per merged PR, `<log folder>/YYYY-MM-DD_PR<N>_<slug>.md`, committed on
  the **log branch** — never on the default branch or a feature branch. The owner may merge the log
  branch into the default branch whenever they like; agents never do.
  - Log branch: agent-logs <!-- default: agent-logs -->
  - Log folder: log <!-- default: log -->
  - Review archive folder (same branch): reviews <!-- default: reviews -->
  - Log tracking starts at: no commits yet (2026-10-01) <!-- default-branch SHA + date when setup ran; earlier PRs are covered by migrated legacy logs or not at all -->
- **Runbooks:** docs/runbooks

## 4. Repository

- **Remote:** pending remote <!-- `pending remote` is a valid value until the owner creates the repository; the builder asks for it before the first PR -->
- **Default branch:** main <!-- usually main -->
- **Merge policy:** Reviewer (GPT-6) approves → Charlie merges. The builder never merges. The reviewer never merges.
- **Commit trailer:** `none` <!-- e.g. "Co-Authored-By: <agent> <model> <email>", or "none" -->
- **PR size target:** 400 LOC (default 400)

## 5. Milestones

- **Unit name:** Milestone <!-- "Phase", "Stage", "Sprint" -->
- **Milestone list lives in:** spec §9 (`docs/specs/2026-10-01-tip-calculator-design.md`) <!-- usually a section of the spec -->
- **Scaffold milestone:** M1 <!-- after this merges, never re-scaffold, re-init git, or redo its paperwork -->

## 6. Model tiers

Role files talk in tiers, never in model names. Map them here.

| Tier | Use for | Model(s) this project uses |
|---|---|---|
| deep | spec design, architecture, security, auth, data isolation, money, milestone gates, implementation plans | Claude Opus 5.5 (builder); GPT-6 (reviewer) |
| standard | normal feature work, most reviews | Claude Sonnet 5.5 |
| fast | mechanical edits, copy, status checks | Claude Haiku 4.5 |

- **Needs owner confirmation before use (cost):** none — the agent must name why the cheaper deep option isn't enough.

## 7. Commands

Leave a command out if the project doesn't have it yet; the scaffold milestone fills them in.

```bash
# install
pending scaffold
# fast checks (run before every push)
pending scaffold  # typecheck
pending scaffold  # lint
pending scaffold  # test
# database: start, migrate, run isolation tests
# none (no database)
# end-to-end
# none (integration tests run inside the test command)
```

**Secret-scan pattern** (base pattern + this project's key prefixes):
```bash
rg -n "SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|BEGIN OPENSSH" .
```

## 8. Active guardrail packs

Tick what applies. Unticked packs are ignored by both roles.
Every rule has an ID (`TEN-09`, `FE-05`). Self-checks and findings cite IDs. Rules marked **(hard)**
are never downgraded below P1.

- [x] `guardrails/universal.md` — always on, do not untick
- [ ] `guardrails/frontend.md` — any UI (semantics, layout, components, WCAG 2.2 AA) — off: the spec has no UI (§2 non-goal)
- [ ] `guardrails/tenancy-rls.md` — multi-tenant data isolation — off: single user, no database
- [x] `guardrails/money.md` — any stored or computed money — on: the API computes tip, total and shares in cents
- [ ] `guardrails/finalized-records.md` — issued/signed/legal documents, sequential numbering — off: no documents, nothing is stored
- [ ] `guardrails/auth.md` — login, sessions, roles, OAuth — off: no login by design (spec §6)
- [ ] `guardrails/public-links.md` — unauthenticated share links, OTP, signatures — off: no share links
- [ ] `guardrails/files-templates.md` — uploads, generated PDFs, user templates — off: no files
- [ ] `guardrails/events-jobs.md` — background jobs, queues, domain events — off: stateless, no jobs
- [ ] `guardrails/payments.md` — payment providers, checkout, webhooks — off: no payment provider; the API only splits a bill

**Pack parameters** (packs refer to these by name):
- Tenant key column: none <!-- e.g. workspace_id, org_id -->
- Tenant session setting: none <!-- e.g. app.workspace_id -->
- Runtime DB role: none · Migration DB role: none
- Scoped transaction helper: none <!-- e.g. withWorkspace(id, tx => …) -->
- Admin/bypass helper (if any): none
- Server action wrapper: none
- Where configurable business values live: `config/app.json` <!-- settings table, platform_config, … -->

## 9. Project-specific hard constraints

Things unique to this product. Generic rules belong in a guardrail pack, not here.

**Out of scope (reviewer rejects scope creep):**
- Login, users, sessions, or any other auth.
- A database, stored history, or any other state.
- Other endpoints (including `GET /health`), other currencies, tax, fees, uneven splits, or a UI.

**Stubs only (interface, no implementation yet):**
- none

**Architecture rules:**
- Money is `bigint` from raw request text to response text. No `number`, `JSON.parse` or `JSON.stringify` for money or money-related config (spec D5, MON-01).
- The request body and `config/app.json` are both read only by `src/json/exact-json.ts`. Rounding lives only in `src/money/split.ts` (MON-04).

**Locked switches (must stay in this state until the condition is met):**
| Switch | Must stay | Until | Evidence lives in |
|---|---|---|---|
| none | n/a | n/a | n/a |

## 10. Never commit

`.agent/` (handoff, review files, worktrees), `.env*` (except `.env.example`), agent tool folders (`.claude/`, `.codex/`, `.cursor/`, `.gemini/`), and:
- none

## 11. Extra approval gates

On top of the gates in `roles/builder.md`:
- none
