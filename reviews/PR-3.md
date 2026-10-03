# Review — PR #3

<!-- Newest round at the top. Keep earlier rounds as history. Only the reviewer writes this file. -->

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

## Round 2 — 2026-10-03 · scope: slice (same head as round 1)
- **Code review:** base (merge base) `1e7e781c74c302bbd672ba89298c4f43d4674461` · head `4fc8f37cdd88334f4eff3b3a5f09a0d02462e3ec` · head re-checked at end: yes
- **Spec:** `docs/specs/2026-10-01-tip-calculator-design.md` v1.2, hash `ee3c51544413a45c581a9dc1ce15a8231a66836a`
- **Change since round 1:** none. GitHub still reports the same PR head, PR body and failed CI run. The three-dot diff is identical. No PR plan or preview URL exists.

**Verdict:** Revision required
**Model used:** GPT-6 · **Switch model next step?** No — money-path corrections still require deep-tier review.

### Findings

### [P0] Every requested tip is replaced with 15%, producing the wrong amount
- Category: defect
- Rule: spec D9 and §§4–5, 7; UNI-02, UNI-03; reviewer §5 money correctness gate
- Evidence: `src/http/parse-body.ts:24,34-36` remains unchanged. It does not check `config.allowedTipPercents` and returns `BigInt(HARDCODED_TIP_PERCENT)` for every valid tip field. Fresh `npm test`: the same 13 failures; round 1 live requests at this exact SHA returned 15% for both 0% and 5% inputs.
- Failure scenario: a 0% request on a $120.50 bill produces an $18.08 tip; an unsupported 5% request returns success.
- Why it matters: the API returns the wrong monetary obligation. The recorded deliberate test cannot lift a P0 money gate.
- Required correction: restore config-backed validation and pass the exact parsed `bigint` tip to `split()`.
- Owner: builder
- Verification: parser and route tests pass; live 0% and rejected/configured 5% requests behave as specified.
- Status: open (unchanged from round 1)

### [P1] Tip percentage passes through a JavaScript `number`
- Category: guardrail mismatch
- Rule: `PROJECT.md` §9; spec D5; MON-01 (hard)
- Evidence: `src/http/parse-body.ts:18,36` still declares the tip as a `number` literal and converts it with `BigInt()`.
- Failure scenario: the exact parsed integer is discarded and a money-related input depends on a floating-point representation.
- Why it matters: it breaches the project's explicit exact-representation boundary even though 15 itself is exactly representable.
- Required correction: validate and propagate the parsed `bigint` without a `number` conversion.
- Owner: builder
- Verification: inspect the corrected path, run the boundary scan and tests, and confirm no tip value becomes `number`.
- Status: open (unchanged from round 1)

### [P1] The PR self-check omits applicable rules
- Category: guardrail mismatch
- Rule: reviewer role §3
- Evidence: the unchanged PR body omits UNI-01–05, UNI-09, UNI-11–13 and UNI-19 from its `Self-check` table; it still says MON-02–07 were “not re-checked.” The diff still changes request parsing and money behavior.
- Failure scenario: the table gives no reviewable evidence for the hardcoded rate, boundary validation or failed CI gate.
- Why it matters: the mandatory audit is incomplete for the controls affected by this PR.
- Required correction: complete the applicable-rule table with supported results or specific n/a reasons.
- Owner: builder
- Verification: compare every row with the applicability list below and recheck each claimed pass.
- Status: open (unchanged from round 1)

### [P2] The runbook smoke test gives a false result for tip 5
- Category: defect
- Rule: reviewer role §7; spec §9 M2
- Evidence: `docs/runbooks/tip-calculator.md:80` still expects `400 INVALID_TIP_PERCENT` for tip 5, while the unchanged parser accepts it. Lines 52–54 still use `curl -s`, which does not display the status that line 79 tells the operator to check. Round 1 live HTTP evidence applies to this unchanged SHA.
- Failure scenario: the documented tip-5 smoke test contradicts the actual `200` response, and the first command does not show its stated status.
- Why it matters: the runbook cannot be executed as a reliable pass/fail check.
- Required correction: restore tip validation, then run the full smoke test; make the first command expose the HTTP status.
- Owner: builder
- Verification: execute all four steps against the corrected build and observe the documented status and body.
- Disposition: before merge
- Status: open (unchanged from round 1)

### Self-check audit

Applicable to this unchanged diff: UNI-01–07, UNI-09, UNI-11–14, UNI-16, UNI-19; MON-01–05 and MON-07; `PROJECT.md` §9 exact `bigint`, shared reader, rounding and scope rules. UNI-08, UNI-10, UNI-15, UNI-17, UNI-18 and MON-06 remain n/a for a local API with no secrets, audit log, database, browser UI, cookies, FX or finalized records.

| Rule | Builder said | Reviewer found | Evidence / disagreement |
|---|---|---|---|
| UNI-01–05 | omitted | UNI-02/03 fail; no additional 01/04/05 defect | Hardcoded rate and ignored validated input remain; typecheck/lint pass. |
| UNI-06, UNI-14 | pass | pass | No dependency or tooling change. |
| UNI-07 | not re-run | pass locally | Secret scan clean again. |
| UNI-09, UNI-11–12, UNI-19 | omitted | no separate defect found | No logging, external data flow or endpoint change; missing self-check rows remain. |
| UNI-13 | omitted | required CI failed | Same failed `ci` run; PR remains open. |
| UNI-16 | pass for runbook text | fail in effective head | Tip-5 smoke test still contradicts runtime. |
| MON-01 | fail | fail | `number` tip at parser lines 18 and 36. |
| MON-02–05, MON-07 | not re-checked | no additional module defect; money result remains wrong | Currency, encoder and rounding modules unchanged; input selection is wrong. |
| `PROJECT.md` §9 | fail | fail | Hardcoded `number` tip and discarded config list. |

### Verification performed

| Command / check | Result |
|---|---|
| `git fetch origin`; pinned merge-base, three-dot stat/name-status/log and `git diff --check` | Same base, head, two commits and three changed files as round 1; whitespace clean. |
| Detached checkout at exact head; `npm ci --prefer-offline --no-audit --no-fund` | Pass. |
| `npm run typecheck`; `npm run lint`; `npm run build`; `npm run secret-scan` | Pass. |
| `npm test` | Fail: 13 failed, 333 passed; same parser and route cases as round 1. |
| Project keyword scan | Only scan-rule and project-instruction matches. |
| GitHub PR head, body and CI; tracked checkout status | Head and body unchanged; `ci` still failed; tracked checkout clean before removal. |
| Live HTTP | Not rerun. Round 1 tested the identical head and remains direct evidence. |

### Residual risks and test gaps
- Dependency audit was not rerun: no dependency or lockfile change, and CI stops at failing tests.
- The builder's handoff still contains older PR 2 sections, with PR 3 updates appended later. GitHub and the pinned checkout resolve code state.

### Required before merge
- Correct the four open findings, restore passing tests and required CI, then request another review at the new head.

### Deferred conditions
- None.

### Optional improvements
- None.

## Round 1 — 2026-10-02 · scope: slice (PR 2 runbook correction plus changed tip parsing)
- **Code review:** base (merge base) `1e7e781c74c302bbd672ba89298c4f43d4674461` · head `4fc8f37cdd88334f4eff3b3a5f09a0d02462e3ec` · head re-checked at end: yes
- **Spec:** `docs/specs/2026-10-01-tip-calculator-design.md` v1.2, hash `ee3c51544413a45c581a9dc1ce15a8231a66836a`
- **Evidence available:** pinned three-dot diff, spec, decisions log, PR 2 review, runbook, source/tests, local checks, live HTTP responses, GitHub CI and branch protection. No PR plan or preview URL exists.

**Verdict:** Revision required
**Model used:** GPT-6 · **Switch model next step?** No — keep a deep-tier reviewer for the money path when the head changes.

### Findings

### [P0] Every requested tip is replaced with 15%, producing the wrong amount
- Category: defect
- Rule: spec D9 and §§4–5, 7; UNI-02, UNI-03; money correctness gate in reviewer §5
- Evidence: `src/http/parse-body.ts:24,34-36` reads but never checks or uses `requestedTipPercent`. Live `POST /split` requests with `billCents:12050`, `people:3`, and `tipPercent:0` or `5` both returned `200` with `tipPercent:15` and `tipCents:1808`. `npm test` failed 13 tests, including the rejection and config-list cases.
- Failure scenario: a caller requests a 0% tip on a $120.50 bill and the API responds with an $18.08 tip; an unsupported 5% tip is accepted instead of rejected.
- Why it matters: the API returns a monetary obligation different from the caller's accepted input and violates the configured allowed-tip rule. The recorded owner test and its exception entry do not lift a P0 money gate.
- Required correction: remove the hardcode; validate the parsed `bigint` tip against `config.allowedTipPercents` and pass that exact value to `split()`. Restore the original success and `INVALID_TIP_PERCENT` behavior.
- Owner: builder
- Verification: rerun the parser and route tests; a live 0% request returns zero tip, a 5% request under default config returns `400 INVALID_TIP_PERCENT`, and a configured 5% request computes 5%.
- Status: open

### [P1] Tip percentage passes through a JavaScript `number`
- Category: guardrail mismatch
- Rule: `PROJECT.md` §9 architecture; spec D5; MON-01 (hard)
- Evidence: `src/http/parse-body.ts:18,36` defines `HARDCODED_TIP_PERCENT = 15` as a `number` and converts it with `BigInt()`. The project contract requires tip percentages to remain `bigint` from raw text into the calculation.
- Failure scenario: the code path no longer preserves the exact parsed integer representation and makes a money-related input depend on a floating-point representation.
- Why it matters: this is an explicit hard architecture boundary for money calculations, even though the current literal 15 happens to be exactly representable.
- Required correction: pass the parsed `bigint` tip through validation and into `SplitInput` without a `number` conversion.
- Owner: builder
- Verification: inspect the corrected path, run the boundary scan/lint and tests, and confirm no money-related value is converted to or from `number`.
- Status: open

### [P1] The PR self-check omits applicable rules
- Category: guardrail mismatch
- Rule: reviewer role §3 (applicable rule missing from self-check is P1)
- Evidence: PR 3 body, `Self-check` table, contains no rows for UNI-01–05, UNI-09, UNI-11–13 or UNI-19, although the PR changes the request boundary and money behavior. In particular, it does not audit UNI-02's hardcoded business rate, UNI-03's boundary validation, or UNI-13's failed required CI. Its MON-02–07 row says only “not re-checked.”
- Failure scenario: a reviewer relying on the table cannot trace the changed parser through all applicable controls or distinguish checked passes from unverified claims.
- Why it matters: the required self-check is incomplete precisely where this PR changes money behavior.
- Required correction: supply an updated table for each applicable rule, with a supported result or a specific n/a reason; report the hardcoded-rate and boundary failures accurately until corrected.
- Owner: builder
- Verification: compare the updated table with the applicability list below and recheck every pass against source or test evidence.
- Status: open

### [P2] The runbook smoke test gives a false result for tip 5
- Category: defect
- Rule: reviewer role §7 (executable runbook); spec §9 M2
- Evidence: `docs/runbooks/tip-calculator.md:80` says a tip-5 request returns `400 INVALID_TIP_PERCENT`; the pinned build returned `200` with a 15% tip. Also, the `curl -s` command at lines 52–54 prints only a body while step 2 at line 79 asks the operator to check status `200`.
- Failure scenario: an operator follows step 3 against this head and sees a response that contradicts the expected result; step 2's stated status cannot be observed with the supplied command alone.
- Why it matters: the runbook cannot be used as written to determine whether this build is healthy.
- Required correction: restore spec-compliant tip validation, then keep step 3 aligned with a live result. Make the step-2 command reveal the HTTP status while preserving a clear body comparison.
- Owner: builder
- Verification: execute all four smoke-test steps against the corrected build and observe the documented status and body for each request.
- Disposition: before merge
- Status: open

### Self-check audit

Applicability list from the two ticked packs and `PROJECT.md` §9 for this diff: UNI-01–07, UNI-09, UNI-11–14, UNI-16, UNI-19; MON-01–05 and MON-07; exact `bigint` parsing, configured tip list, single rounding module, and scope limits. UNI-08, UNI-10, UNI-15, UNI-17, UNI-18 and MON-06 are n/a because this API has no secrets, audit log, database, browser UI or cookies, FX, or finalized records. The PR's self-check is partial, as described above.

| Rule | Builder said | Reviewer found | Evidence / disagreement |
|---|---|---|---|
| UNI-01–05 | omitted | UNI-02/03 fail; 01/04/05 no separate defect found | Parser hardcodes a business rate and discards a validated input; lint and typecheck still pass. |
| UNI-06, UNI-14 | pass | pass | No dependency, lockfile, or tooling change. |
| UNI-07 | not re-run | pass locally | `npm run secret-scan` clean. |
| UNI-09, UNI-11–12, UNI-19 | omitted | no separate defect found | No logging, external-data flow or endpoint addition in the diff; these rows still belong in the self-check. |
| UNI-13 | omitted | gate working, PR not ready | GitHub `ci` failed; current `main` protection requires `ci` and enforces admins. |
| UNI-16 | pass for runbook text | fail in effective head | New response layout matches the encoder; smoke-test step 3 contradicts changed runtime behavior. |
| MON-01 | fail | fail | `src/http/parse-body.ts:18,36`; exact-representation boundary broken. |
| MON-02–05, MON-07 | not re-checked | no separate module defect; changed input invalidates money result | Currency, encoder and rounding code unchanged; tip selection is wrong before those modules run. MON-06 is n/a. |
| `PROJECT.md` §9 architecture and scope | fail | fail | Number conversion and hardcoded tip violate exact-input and config rules; no new endpoint or storage. |

### Verification performed

| Command / check | Result |
|---|---|
| Pinned three-dot diff; `git diff --check` | Three changed files, 33 additions/6 deletions; whitespace check clean. |
| `npm ci --prefer-offline --no-audit --no-fund` in detached checkout | Pass. |
| `npm run typecheck`; `npm run lint`; `npm run build` | Pass. |
| `npm test` | Fail: 13 failed, 333 passed, across 11 test files; failures identify ignored tip values and config list. |
| `npm run secret-scan`; project keyword scan | Clean; keyword hits only scan rules and project instructions. |
| Live server, `curl -i` with tip 15, 5 and 0 | All return 200 with the same 15% tip and 1808 tip cents. Tip 5 and 0 contradict the spec and runbook. |
| GitHub PR checks and current branch protection | `ci` failed for pinned head; `main` requires `ci` and enforces admins. |
| `git status --short --untracked-files=no` in detached checkout; PR head re-read | Tracked tree clean; head unchanged at `4fc8f37c`. Detached checkout removed. |

### Residual risks and test gaps
- Dependency audit was not rerun locally because this PR changes no dependencies or lockfile; CI stops at failing tests before reaching its audit step.
- The handoff retains older PR 2 state in §§0–7, then adds PR 3 updates in §§11–13. The repo and GitHub establish the reviewed code state; builder should consolidate the handoff after resolving this PR.
- This review assesses the current head only. The PR body calls the hardcode a deliberate test; that description does not make the money behavior mergeable.

### Required before merge
- Resolve both money findings, restore passing tests and required CI, complete the self-check, and verify the full runbook against the corrected build.

### Deferred conditions
- None.

### Optional improvements
- None.
