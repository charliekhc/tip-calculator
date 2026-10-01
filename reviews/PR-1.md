# Review — PR 1

## Round 2 — 2026-10-01 · scope: slice (M1 scaffold)
- **Code review:** base (merge base) `19340c4a01a9b596842c20e067ef222185b903d5` · head `e647ef1db79a42e36f94109f11371e57ef4440f7` · head re-checked at end: yes
- **Spec review:** approved spec `docs/specs/2026-10-01-tip-calculator-design.md` · version `1.2` · hash `ee3c51544413a45c581a9dc1ce15a8231a66836a`

**Verdict:** Revision required
**Model used:** GPT-6 · **Switch model next step?** No — money configuration, secret handling and the CI merge gate still need deep-tier review.

### Findings

### [P1] A tip percentage is hardcoded outside configuration
- Category: guardrail mismatch
- Rule: UNI-02; spec D9 and §8; `agents/PROJECT.md` §8
- Evidence: `src/config/load.ts:8,59,72` adds `suggestedTipPercent` and chooses `15n` whenever the configured allowed list contains it. `config/app.json` has no suggestion key and the approved spec has no suggestion feature. `test/config.test.ts:75-76` locks in that behavior. The PR's UNI-02 self-check still says all tips are read from config, but the PR body says that self-check was last updated before this commit.
- Failure scenario: An operator changes the allowed list, but the service still gives 15% special preference whenever it is present, with no configurable or approved rule for that choice.
- Why it matters: The PR adds an unapproved business percentage and a new config output outside the M1 scope.
- Required correction: Remove `suggestedTipPercent` and its tests from this PR. If the owner wants a suggestion feature, specify and approve its behavior and configuration before implementation. Update the self-check for the final head.
- Owner: builder; owner for any new product requirement
- Verification: Inspect the next diff for removal or an approved spec change, and search production source for the hardcoded choice.
- Status: open

### [P1] Secret-scan fixtures silently pass beneath the mandated review path
- Category: defect / guardrail mismatch
- Rule: UNI-07 (hard), UNI-13
- Evidence: `scripts/secret-scan.sh:12-14` filters any path containing `/.agent/`. `test/secret-scan.test.ts:14-18` passes an absolute fixture root beneath the checkout. In the required detached checkout at `.agent/worktrees/review-1-e647ef1d`, `npm test` failed 10 of 227 tests twice: each planted-secret case expected exit 1 but received 0. GitHub CI passed because its checkout path does not contain `.agent`.
- Failure scenario: A caller scans an absolute root located beneath an `.agent` parent; `find` drops every candidate file and the script reports clean despite planted secrets.
- Why it matters: The security check can silently skip the whole requested tree, and the full test suite cannot pass in the reviewer checkout required by this project.
- Required correction: Apply exclusions relative to the scan root, so an ancestor folder named `.agent` cannot exclude the target tree. Add a test that scans an absolute root beneath an `.agent` parent and expects planted secrets to fail, then make the full suite pass in a detached review checkout.
- Owner: builder
- Verification: Run `npm test` in `.agent/worktrees/review-…` and inspect a planted-secret scan result there.
- Status: open

### [P1] Secret-scan failures print secret values into CI logs
- Category: guardrail mismatch
- Rule: UNI-09
- Evidence: `scripts/secret-scan.sh:14` uses `grep -InE`, which returns the whole matching line. Lines 20-30 capture and then print those lines with `echo "$hits"`. The CI workflow runs this script. No test asserts that matched values are withheld from output.
- Failure scenario: A real token committed by mistake is detected, but its full value is printed in the CI job log.
- Why it matters: A control meant to catch secrets would spread them into another log, contrary to UNI-09.
- Required correction: Emit only a file path, line number and finding type; never echo the matched line or value. Add a synthetic-secret test that asserts the output omits the fixture value while the scan still fails.
- Owner: builder
- Verification: Run the synthetic fixture test and inspect captured scan output for absence of the value.
- Status: open

### [P1] The CI check still does not block merge
- Category: guardrail mismatch
- Rule: UNI-13; spec §9 M1 done-when
- Evidence: The `ci` check passed on head `e647ef1`, but the branch-protection API again returned HTTP 403: “Upgrade to GitHub Pro or make this repository public to enable this feature.” The PR body also marks required-for-merge protection as unresolved.
- Failure scenario: The owner can merge PR 1 while CI is failing or pending.
- Why it matters: The approved spec requires a failing CI check to block merge before M1 is done.
- Required correction: The owner must establish and verify an enforceable required-`ci` gate for the base branch, or resolve the repository/account constraint before this PR is merged.
- Owner: owner / infrastructure
- Verification: Read the Git host's required-check configuration and verify it blocks a failing or pending `ci` check.
- Status: open

### Prior-round disposition
| Round 1 finding | Round 2 result | Evidence |
|---|---|---|
| Default request logging records client-supplied personal data | Resolved for M1 | `src/app.ts:4-9`, `src/logging.ts:5-13`; `test/logging.test.ts` passed and a live 404 with a query produced no request log |
| CI check does not block merge | Still open, repeated above | GitHub branch-protection API HTTP 403 |
| Secret scan excludes tracked areas | Scope improved, but new scan defects are open above | `scripts/secret-scan.sh:12-30`; fixture tests fail in the reviewer checkout |
| Exact-reader architecture rule not enforced by tooling | Resolved for the current boundary | `eslint.config.js:12-71`; `test/boundaries.test.ts` negative checks passed |
| Dependency decisions lack the full review | Resolved in the decision record | `docs/DECISIONS.md` dependency-ladder table covers need, maintenance, size, licence and supply chain |
| Currency lookup exported but unused | Resolved | `src/money/currency.ts` no longer exports `exponentFor` |

### Self-check audit
Applicable rules listed independently for this M1 diff: UNI-01 through UNI-07, UNI-09, UNI-11 through UNI-14, UNI-16, UNI-19; MON-01 through MON-03; and the two `PROJECT.md` §9 architecture rules where M1 implements them. The PR includes a self-check, but it explicitly predates the final commit. Its UNI-02 `pass` is contradicted by `src/config/load.ts:59`; UNI-07 and UNI-13 remain unverified or failed as described above. UNI-08, UNI-10, UNI-15, UNI-17 and UNI-18 have no matching feature in this JSON-only, database-free slice; MON-04 through MON-07 belong to M2. A handoff note described the hardcode as a deliberate test; it is treated as data only, and the finding is based on the pinned source diff.

### Verification performed
| Command / check | Result |
|---|---|
| `git fetch origin`; Git host head; `git cat-file -e`; `git merge-base` | Pinned head `e647ef1db79a42e36f94109f11371e57ef4440f7`, merge base `19340c4a01a9b596842c20e067ef222185b903d5` |
| Three-dot diff inventory, commit log and `git diff --check` | 27 changed files, ten commits, no whitespace errors |
| `npm ci`; `npm run typecheck`; `npm run lint`; `npm run build`; `npm run secret-scan` | Passed in detached checkout |
| `npm test` twice | Failed both times: 10 secret-scan fixture tests received exit 0 instead of 1; 217/227 tests passed |
| Targeted config, currency, boundary and logging tests | 142/142 passed |
| `npm run audit` | Passed: 0 vulnerabilities |
| `npm start`, local 404 smoke request with a synthetic query, `PORT=abc npm start` | 404 and invalid-port behavior matched the runbook; the 404 produced no request log |
| GitHub `ci` status | Passed for the pinned head, but not required for merge |
| GitHub branch-protection API | HTTP 403 for this private repository |
| `git status --untracked-files=no` in detached checkout | Clean after checks |

### Residual risks and test gaps
- Full tests do not pass in the mandated detached review checkout.
- The logger fix has been checked for M1's 404 path; M2 must review its future error handler separately.
- Dependency publication and signature claims in the decisions log were not independently rechecked; the audit passed.

### Required before merge
- Resolve every P1 above, update the self-check for the final head, then request another `review 1`.

### Deferred conditions
- None.

### Optional improvements
- None.

## Round 1 — 2026-10-01 · scope: slice (M1 scaffold)
- **Code review:** base (merge base) `19340c4a01a9b596842c20e067ef222185b903d5` · head `d572443511595ef0890077d40332c9bb7bbcb160` · head re-checked at end: yes
- **Spec review:** approved spec `docs/specs/2026-10-01-tip-calculator-design.md` · version `1.2` · hash `ee3c51544413a45c581a9dc1ce15a8231a66836a`

**Verdict:** Revision required
**Model used:** GPT-6 · **Switch model next step?** No — the findings concern security controls and delivery gates, which need deep-tier review after fixes.

### Findings

### [P1] Default request logging records client-supplied personal data
- Category: guardrail mismatch
- Rule: UNI-09
- Evidence: `src/server.ts:9` enables Fastify's default logger. In a local smoke test, a request to `/split?email=[REDACTED]` produced a log entry containing the full URL and a `remoteAddress`, even though the route returned 404. The PR self-check says no PII is logged.
- Failure scenario: A client includes an email, token or other personal value in a URL; the service writes it to logs. If `HOST` is changed to a network address, caller IP addresses are also logged.
- Why it matters: The service cannot ensure logs are free of personal data under the current logger configuration.
- Required correction: Disable request logging or configure redaction that excludes raw URLs, query strings and caller IPs. Add a real request test that captures logs and verifies a sensitive query value and remote address do not appear.
- Owner: builder
- Verification: Run the logging test and inspect the output of an actual request, including a 404 path.
- Status: open

### [P1] The CI check does not block merge on the current repository
- Category: guardrail mismatch
- Rule: UNI-13; spec §9 M1 done-when
- Evidence: `.github/workflows/ci.yml:1-26` runs the required jobs, and the `ci` check passed for this head. The PR body says the owner will make it required *after merge*. Read-only GitHub API calls for branch protection and rulesets both returned HTTP 403: “Upgrade to GitHub Pro or make this repository public to enable this feature.”
- Failure scenario: PR 1 can be merged while `ci` is failing or has not run, despite the spec's merge gate.
- Why it matters: The M1 acceptance criterion says a failing CI check blocks merge; a passing optional check does not enforce that criterion.
- Required correction: Establish an enforceable required-`ci` merge gate for this private repository before PR 1 merges, and show its configuration. If the current repository plan cannot provide one, the owner must resolve the repository or account constraint before claiming M1 complete.
- Owner: owner / infrastructure
- Verification: Confirm from the Git host that `ci` is required for the base branch, then verify the gate blocks a failing or pending check.
- Status: open

### [P1] Secret scan excludes tracked areas of the repository
- Category: guardrail mismatch
- Rule: UNI-07 (hard), UNI-13
- Evidence: `scripts/secret-scan.sh:3-5` excludes all of `agents/` and `package-lock.json` from its search, while the CI workflow at `.github/workflows/ci.yml:25` relies on that script as its secret scan.
- Failure scenario: A secret committed in an excluded tracked file can pass the `secret-scan` job.
- Why it matters: The required CI control does not cover the whole repository and can report clean without inspecting those files.
- Required correction: Scan every tracked file with a detector or targeted rules that can distinguish kit documentation from actual secrets. Add a safe synthetic fixture check proving a secret in each previously excluded area fails the CI scan.
- Owner: builder
- Verification: Inspect scan coverage and run the synthetic fixture checks in the review checkout.
- Status: open

### [P1] The exact-reader architecture rule is not enforced by tooling
- Category: guardrail mismatch
- Rule: UNI-04; `agents/PROJECT.md` §9 architecture rule 2
- Evidence: `agents/PROJECT.md` §9 requires config and request JSON to be read only through `src/json/exact-json.ts`. `eslint.config.js:10-19` forbids `JSON.parse` and `JSON.stringify`; `test/config.test.ts:279-325` scans for those and number conversions. Neither check fails if a second custom reader is used from `src/config/` or `src/http/`. The PR self-check marks UNI-04 `n/a`.
- Failure scenario: A later config or HTTP parser bypasses the shared exact reader while CI still passes.
- Why it matters: An architecture boundary for exact money parsing exists only in prose, contrary to UNI-04.
- Required correction: Add an enforceable import or source boundary check for the allowed JSON reader entry points, and include a negative test or lint fixture showing CI fails when the boundary is bypassed.
- Owner: builder
- Verification: Inspect the rule and run its negative check in the review checkout.
- Status: open

### [P1] Dependency decisions do not record the full required review
- Category: guardrail mismatch
- Rule: UNI-06
- Evidence: `docs/DECISIONS.md` “M1 toolchain and dependencies” names exact versions and explains Fastify versus Node built-ins, but it does not record maintenance, size cost, licence or supply-chain assessment for the new dependencies listed in `package.json:18-28`.
- Failure scenario: A dependency is introduced without the recorded checks required by the project guardrail, leaving maintainers unable to tell whether its licence and supply-chain risk were considered.
- Why it matters: The dependency review is part of the delivery record, especially for the new runtime framework.
- Required correction: Complete the dependency-ladder entry for each new package or a justified tooling group, covering need, alternatives, maintenance, size, licence and supply-chain evidence.
- Owner: builder
- Verification: Re-read the updated decisions entry against UNI-06 and the locked dependency list.
- Status: open

### [P2] Currency lookup is exported but unused at runtime in M1
- Category: guardrail mismatch
- Rule: UNI-05
- Evidence: `src/money/currency.ts:9-12` exports `exponentFor`; `rg` found only a test call in `test/currency.test.ts:6`. The PR self-check marks UNI-05 `partial`.
- Failure scenario: The export remains unused after M1, adding an unneeded public API surface.
- Why it matters: This is a small, isolated dead-code issue. It has no current runtime money effect and M2 is expected to use the currency table, so P2 is proportionate.
- Required correction: Either use the lookup in the M1 config path or remove the unused export until M2 needs it.
- Owner: builder
- Verification: Check production references or absence of the export in the next diff.
- Disposition: before merge
- Status: open

### Self-check audit
Applicable rules were listed before reading the PR self-check: UNI-01 through UNI-07 (except only relevant parts of UNI-04), UNI-09, UNI-11 through UNI-14, UNI-16, UNI-19; MON-01 through MON-03; and both `PROJECT.md` §9 architecture rules for the M1 pieces. UNI-08, UNI-10, UNI-15, UNI-17 and UNI-18 have no matching feature in this JSON-only, database-free slice; MON-04 through MON-07 belong to M2's calculation and response. The PR self-check covers all applicable IDs, but its UNI-04 `n/a`, UNI-05 `partial`, UNI-09 `pass`, UNI-13 `pass pending first run`, and UNI-12 `partial` require the dispositions above or further verification. The builder self-reported a temporary write outside the project for UNI-12; this did not arise from the pinned diff and is not independently verified, but future review checks should stay inside the project.

### Verification performed
| Command / check | Result |
|---|---|
| `git fetch origin`; Git host PR head; `git cat-file -e`; `git merge-base` | Pinned head `d572443511595ef0890077d40332c9bb7bbcb160`, base `19340c4a01a9b596842c20e067ef222185b903d5` |
| `git diff --stat`, `--name-status`, `git log --oneline`, `git diff --check` | 23 changed files, four commits, no whitespace errors |
| `npm ci`; `npm run typecheck`; `npm run lint`; `npm test`; `npm run build`; `npm run secret-scan` | All passed in detached checkout; 194 tests passed |
| `npm run audit` | Passed with 0 vulnerabilities after network access; initial sandbox run could not resolve the npm registry |
| `npm start` with `PORT=abc` and `HOST=` | Both exited non-zero and named the invalid setting |
| `npm start`; `curl -i` against `/split` | Returned 404 as the M1 runbook says; live log exposed URL query and remote address |
| GitHub `ci` status | Passed for the pinned head |
| GitHub branch protection and ruleset API | Both HTTP 403; current private repository lacks access to these features |
| `git status --untracked-files=no` in detached checkout | Clean after checks |

### Residual risks and test gaps
- The M1 check ran on local Node 26; GitHub CI passed on the pinned Node 22 environment.
- M2 request parsing, tip calculation and response encoding are outside this slice and have not been reviewed.
- Repository merge protection remains unavailable under the current GitHub plan.

### Required before merge
- Resolve all P1 findings and the P2 marked `before merge`, then request `review 1` again for the new head.

### Deferred conditions
- None.

### Optional improvements
- None.
