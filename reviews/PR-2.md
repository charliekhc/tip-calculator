# Review — PR #2

<!-- Newest round at the top. Keep earlier rounds as history. Only the reviewer writes this file. -->

## Round 1 — 2026-10-01 · scope: feature-complete (retrospective, PR already merged)
- **Code review:** base (merge base) `a6add90a9be12f02042feddbcb219d1a34cbe568` · head `e1f85489155c1d7c6494b72c523c9f3cb18b3508` · head re-checked at end: yes
- **Spec:** `docs/specs/2026-10-01-tip-calculator-design.md` v1.2, hash `ee3c51544413a45c581a9dc1ce15a8231a66836a`
- **Context:** PR 2 merged at 2026-10-01T04:09:50Z before any reviewer verdict or approval receipt. This review assesses the pinned PR head retrospectively; it does not repair that delivery-gate breach.

**Verdict:** Revision required
**Model used:** GPT-6 · **Switch model next step?** No — deep review covered the money and HTTP paths; the builder can make the documentation correction.

### Findings

### [P2] Runbook's exact smoke-test response differs from the server response
- Category: defect
- Rule: spec §9 M2; reviewer role §7 (executable runbook)
- Evidence: `docs/runbooks/tip-calculator.md:57-60,70-71` shows a one-line JSON response and says it must match exactly. `src/http/encode.ts:23-35` emits a multi-line response. A live `curl -i` to the pinned build returned `200` and the multi-line response.
- Failure scenario: an operator follows the smoke test and compares response bytes with the runbook. The valid server response appears to fail the stated check.
- Why it matters: the documented pass condition cannot be met by the implementation, so the runbook gives a false failure for a healthy service.
- Required correction: show the actual multi-line response in the runbook, or state that the comparison is by parsed JSON values rather than bytes; keep the status check explicit.
- Owner: builder
- Verification: run the documented curl against the built server and verify the stated expected result matches the actual result under the comparison the runbook specifies.
- Disposition: before merge (the PR has already merged; address in a corrective PR)
- Status: open

### Self-check audit

Independent applicability list, made from the ticked packs and `PROJECT.md` §9 before comparing the PR table: UNI-01–07, UNI-09, UNI-11–14, UNI-16, UNI-19; MON-01–05, MON-07; the bigint/exact-reader boundary, single rounding module, and out-of-scope constraints. UNI-08, UNI-10, UNI-15, UNI-17, UNI-18 and MON-06 are not applicable: this local API has no secrets, audit log, database, browser UI or cookies, FX, or finalized records. No applicable rule is missing from the builder's table.

| Rule | Builder said | Reviewer found | Evidence / disagreement |
|---|---|---|---|
| UNI-01–05 | pass | pass | Strict TypeScript; config-backed list and limits; boundary validation; lint-enforced exact-reader imports; no dead code found in changed modules. |
| UNI-06 | pass | pass | No dependency or lockfile change. |
| UNI-07 | pass | pass | Secret-scan script clean; keyword scan hits only the scan rule and project instructions. |
| UNI-08, UNI-10, UNI-15, UNI-17, UNI-18 | n/a | n/a | No corresponding store, migration, browser UI, or cookies. |
| UNI-09 | pass | pass | `src/app.ts:28-36`; 500 test excludes URL, query, headers, body and caller address from logs. Startup logging still includes the server hostname and PID; these are not caller data. |
| UNI-11–12 | pass | no contrary evidence | Public GitHub remote is owner-authorized; no changed code sends request data externally. Builder's local write locations cannot be fully reconstructed from the PR. |
| UNI-13 | pass pending first run | pass for this head | Local checks passed; GitHub `ci` succeeded for the pinned head; current `main` protection requires `ci` and enforces admins. A failing-check merge attempt was not tested. |
| UNI-14 | pass | pass | Pinned package versions, committed lockfile and pinned CI actions. |
| UNI-16 | pass | mismatch | Runbook changed in the PR, but its exact smoke-test output is wrong; finding above. |
| UNI-19 | pass | pass | Only `POST /split` is registered; unknown paths/methods use framework 404/405. |
| MON-01–05, MON-07 | pass | pass | Exact `bigint` parser, calculation and encoder; USD currency table and response code; one rounding module; input-only request; unit, property and integration tests passed. MON-06 is n/a. |
| `PROJECT.md` §9 architecture and scope | pass | pass | `src/` scan found only the two allowed framework number conversions in `src/config/load.ts`; no `JSON.parse`/`JSON.stringify`, extra endpoint, database, auth, tax, fee or UI. |

### Verification performed

| Command / check | Result |
|---|---|
| Pinned PR head and three-dot diff; `git diff --check` | Head `e1f85489` unchanged; 12 files, 749 additions/8 deletions; whitespace check clean. |
| `npm ci --prefer-offline --no-audit --no-fund` in detached checkout | Pass. |
| `npm run typecheck`; `npm run lint`; `npm run build` | Pass. |
| `npm test` | 11 files, 346 tests passed. |
| `npm run secret-scan` | Clean. |
| `npm run audit` | 0 vulnerabilities (rerun with network access after sandbox DNS failure). |
| Live server on `127.0.0.1:43218`, two `curl -i` requests | Valid spec input: 200 with exact money values; tip 5: 400 `INVALID_TIP_PERCENT`. Output format confirms finding. |
| `PORT=abc npm start` | Exits 1, names `PORT`. |
| GitHub PR and branch protection | PR head unchanged, merged; successful `ci`; current protection requires `ci` and enforces admins. |
| `git status --short --untracked-files=no` in detached checkout | Clean before cleanup. |

### Residual risks and test gaps
- This retrospective verdict cannot supply the pre-merge reviewer record or approval receipt. The merged PR log records both gate breaches.
- A failing CI check was not induced to prove GitHub rejects a merge in that state. Current protection settings require `ci`.
- The detached checkout was removed, but `git worktree remove` could not delete its `.git/worktrees/` metadata because the sandbox denied that write. The stale entry is prunable; no tracked files were changed.

### Required before merge
- The runbook smoke-test comparison needs correction. Because PR 2 is already merged, make that correction in a new reviewed PR.

### Deferred conditions
- None.

### Optional improvements
- None.
