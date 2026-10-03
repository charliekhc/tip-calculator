# PR 3 — docs: runbook shows the real multi-line smoke-test response and prints the status

- **Merged:** 2026-10-03T01:16:00Z (GitHub) · **Merge commit:** 99ce795a523816e7145eabb0b0f9b141e560d8a2 · **Branch:** fix/runbook-smoke-test
- **Gate breaches:** none. Final review round 3 head `16897f025d7084d9736ee1e0d173c6392b66dbd5` equals the PR's final head. The receipt was written 2026-10-03T01:15:25Z, before the merge at 01:16:00Z, and names that head and the final review-file hash `da46c187e00e97074d9ef5621219ae931b63f019`.
- **Approval receipt:** `reviews/PR-3.receipt` on `agent-logs`, review-log-branch commit `f9b939be508433f7eae9907b329c23ba5d81c856` (receipt itself in commit `ea6a38450a80073cd406a905de92647d4571cffc`)
- **Merge evidence:** `gh pr view 3` on `charliekhc/tip-calculator` reports state MERGED, merge commit 99ce795, merged at 2026-10-03T01:16:00Z, final head 16897f0; `git merge-base --is-ancestor 99ce795 origin/main` succeeded after fetch. The `ci` check on the head concluded pass.
- **Drafted by:** Claude Sonnet 5.5 (builder) · **Final verdict:** Approved (round 3)
- **Spec:** `docs/specs/2026-10-01-tip-calculator-design.md` v1.2 · **Plan:** none · **Milestone:** none (corrective PR for the PR 2 review; spec §9 lists only M1 and M2)

## What changed
Corrects the runbook smoke test in `docs/runbooks/tip-calculator.md`. The expected `POST /split` body is the real multi-line text. The first `curl` prints the HTTP status on its own line (`-w`), and step 2 checks `200` and a line-for-line body match. `docs/DECISIONS.md` gained two entries. Net change against `main`: 2 files, +30 / -4 lines, docs only. The branch history also holds an owner-requested hardcoded 15% tip (`4fc8f37`) and its revert (`16897f0`); neither is in the net diff.

## Why
PR 2 review round 1 (P2): the runbook's one-line expected response could never match the server output.

## Review rounds
- R1 (2026-10-02, on head `4fc8f37`): [P0] Every requested tip is replaced with 15% · [P1] Tip percentage passes through a JavaScript `number` · [P1] The PR self-check omits applicable rules · [P2] The runbook smoke test gives a false result for tip 5. Cause: the owner-requested hardcode test.
- R2 (2026-10-03, same head, no change since R1): same four findings, all still open.
- R3 (2026-10-03, head `16897f0`): Approved. Fixes: hardcode reverted, parser restored to `main` (P0, P1); PR body self-check completed (P1); runbook `curl` prints the status and step 2 checks it (P2).

## Deferred conditions
none

## Decisions worth keeping
- `docs/DECISIONS.md` on `main`: "Runbook shows the real multi-line response" (owner chose the real multi-line text over a parsed-JSON comparison) and "Hardcoded 15% tip (owner-requested test, PR 3 only)", marked superseded: the hardcode was reverted after the P0/P1 findings.
- A reviewer P0 money gate is not lifted by an owner-recorded test exception.

## Follow-ups
- Pino logs include hostname and pid; consider `base: null` in a later reviewed PR.
- A failing `ci` was never induced on a merge attempt to prove the gate blocks it. (PR 3 had a failing `ci` while open and was not merged until it passed.)
- PR 2 still has its gate breaches on record; PR 2 retrospective review `reviews/PR-2.md` is archived.
- Housekeeping: stale prunable worktree `.agent/worktrees/review-2-e1f85489` (needs owner OK for `git worktree prune`); fast-forward the main checkout to `origin/main`.
- The spec lists no further milestone. An M3 needs a new spec or an owner decision.

## Appendix — final review round
## Round 3 — 2026-10-03 · scope: slice (runbook correction)
- **Code review:** base (merge base) `1e7e781c74c302bbd672ba89298c4f43d4674461` · head `16897f025d7084d9736ee1e0d173c6392b66dbd5` · head re-checked at end: yes
- **Spec:** `docs/specs/2026-10-01-tip-calculator-design.md` v1.2, hash `ee3c51544413a45c581a9dc1ce15a8231a66836a`
- **Evidence:** pinned three-dot diff, spec, decisions log, handoff, prior review rounds, source, tests, live HTTP, CI and branch protection. No PR plan or preview URL exists; no database or UI is in scope.

**Verdict:** Approved
**Model used:** GPT-6 · **Switch model next step?** No — this slice is ready for the normal approval gate.

### Findings

No open findings. All four round 2 findings are resolved at this head:

1. **P0 wrong tip:** `src/http/parse-body.ts:33-35` validates against `config.allowedTipPercents` and passes the requested `bigint`. Live tip 0 returned `tipCents: 0`; tip 5 returned `400 INVALID_TIP_PERCENT`; all 346 tests pass.
2. **P1 JavaScript `number` tip:** `src/http/parse-body.ts:25-35` keeps the tip as `bigint`; the effective diff has no `src/` or `test/` changes against the base.
3. **P1 incomplete self-check:** the updated PR description covers the applicable universal, money and project rules with evidence or a reason for n/a; the claimed checks were re-verified below.
4. **P2 false smoke test, before merge:** `docs/runbooks/tip-calculator.md:52-80` shows the multiline body and prints status on a separate line. Live steps 2–4 gave the documented results, including a non-zero exit for invalid `PORT`.

### Self-check audit

I determined applicability from the effective docs-only diff and the earlier money-path findings before using the PR self-check. Applicable: UNI-01–07, UNI-13–14, UNI-16, MON-01–05 and MON-07, and `PROJECT.md` §9. UNI-09, UNI-11–12 and UNI-19 need a no-change check. UNI-08, UNI-10, UNI-15, UNI-17–18 and MON-06 are n/a for this local API without secrets, audit logs, a database, browser UI, cookies, FX or finalized records.

| Rule | Builder said | Reviewer found | Evidence / disagreement |
|---|---|---|---|
| UNI-01–05 | pass | pass | No effective source diff; typecheck and lint pass; parser again uses the config list and exact values. |
| UNI-06, UNI-14 | pass | pass | No dependency, lockfile, tooling or CI diff. |
| UNI-07 | pass | pass | `npm run secret-scan` clean; project keyword hits only scan rules and instructions. |
| UNI-09, UNI-11–12, UNI-19 | n/a | n/a for this diff | No logging, external data flow or endpoint change. |
| UNI-13 | pass | pass | GitHub `ci` passed at the pinned head; `main` protection requires `ci` and enforces admins. Local typecheck, lint, tests, build, audit and secret scan pass. |
| UNI-16 | pass | pass | Live runbook steps 2–4 match the documented body, statuses and startup error. |
| MON-01–05, MON-07; `PROJECT.md` §9 | pass | pass | No effective money-source diff; parser lines 25–35 use `bigint` and config validation, and the money/route tests pass. |

### Verification performed

| Command / check | Result |
|---|---|
| `git fetch origin`; pin host head; `git cat-file`, merge-base, three-dot stat/name-status/log/diff and `git diff --check` | Base and head above; net diff only `docs/DECISIONS.md` and `docs/runbooks/tip-calculator.md` (+30/-4); whitespace clean. Temporary hardcode commit is fully reverted in the effective source. |
| Detached checkout `.agent/worktrees/review-3-16897f02`; `npm ci --prefer-offline --no-audit --no-fund` | Pass at exact head. |
| `npm run typecheck`; `npm run lint`; `npm test`; `npm run build`; `npm run secret-scan` | Pass; 346/346 tests. |
| `npm run audit` | First sandbox run could not resolve npm registry; permitted network retry passed with zero vulnerabilities. |
| Live `npm start`; documented `curl` (tip 15); tip 5 and tip 0 requests; `PORT=abc npm start` | Tip 15: exact multiline body, then status `200`; tip 5: `400 INVALID_TIP_PERCENT`; tip 0: `tipCents: 0`; invalid PORT: exit 1 and message naming PORT. |
| Project secret keyword scan; GitHub PR/CI/protection; tracked checkout status | No secret found; PR remained open at pinned head, `ci` passed, protection requires it; tracked checkout clean. Detached checkout removed. |

### Residual risks and test gaps

- No preview or browser testing applies to this API. The decision entry for the temporary hardcode remains as a superseded historical record; its original failing-test text is not the current head's behavior.

### Required before merge

- None. Approval applies only to the head SHA above; follow the project's `approved 3` archive and receipt gate before Charlie merges.

### Deferred conditions

- None.

### Optional improvements

- None.
