# Review — PR 1

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
