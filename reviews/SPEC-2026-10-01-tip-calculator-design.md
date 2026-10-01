# Review — 2026-10-01-tip-calculator-design

## Round 3 — 2026-10-01 · scope: feature-complete specification
- **Code review:** n/a — no Git repository or implementation yet
- **Spec review:** spec path `docs/specs/2026-10-01-tip-calculator-design.md` · version `1.2` · hash (`git hash-object`) `ee3c51544413a45c581a9dc1ce15a8231a66836a`

**Verdict:** Approved
**Model used:** GPT-6 · **Switch model next step?** No — the spec is approved; the builder can reconcile project setup before implementation.

### Findings
No open findings for this spec version.

### Prior-round disposition
| Round 2 finding | Round 3 result | Evidence |
|---|---|---|
| Config parsing can pass money and tip values through JavaScript numbers | Resolved in the spec | D5 and shared exact reader at `docs/specs/2026-10-01-tip-calculator-design.md:26,39-58`; config type and exactness tests at lines 125 and 160 |
| Environment settings have no M1 runbook requirement | Resolved in the spec | M1 runbook deliverable and smoke checks at `docs/specs/2026-10-01-tip-calculator-design.md:160`; M2 update at line 161 |

### Self-check audit
`PROJECT.md` is still an unfilled setup template, so its identity, paths, model tiers, commands, guardrail ticks and project-specific constraints could not be used. No code diff or builder self-check table exists for this pre-setup spec review. Applicability was derived from the stateless API scope: UNI-01, UNI-02, UNI-03, UNI-06, UNI-07, UNI-13, UNI-14, UNI-16 and UNI-19; MON-01, MON-02, MON-03, MON-04, MON-05 and MON-07. The revised spec states testable controls for the applicable money, boundary, delivery and runbook requirements. UNI-17 is not applicable to the JSON-only loopback API with no browser UI; UNI-18 has no cookies. Implementation compliance must be checked in M1 and M2 PR reviews.

### Verification performed
| Command / check | Result |
|---|---|
| Read spec v1.2, previous review rounds, `PROJECT.md`, decisions log, handoff, reviewer role, universal and money guardrails | Complete; decisions log has no entries and `PROJECT.md` remains unfilled |
| `git hash-object docs/specs/2026-10-01-tip-calculator-design.md` | `ee3c51544413a45c581a9dc1ce15a8231a66836a` |
| Check D7-D8 worked examples and configured maximum | Listed shares sum to totals; maximum `billCents * tipPercent + 50n` is `100000000000050n` |
| Check M1/M2 against prior findings and guardrails | Exact config parsing, limit tests, lockfile, CI gates and runbook are specified with acceptance checks |
| `git status --short` | Unavailable: this directory is not yet a Git repository |
| CI, typecheck, tests, runtime and runbook execution | Unavailable: no implementation exists |

### Residual risks and test gaps
- The custom JSON reader, encoder, Fastify integration, CI and runbook are design commitments only. Verify their actual behavior during M1 and M2 PR reviews.
- `PROJECT.md` must be filled and reconciled with this approved spec hash before build.

### Required before merge
- None for the specification. Implementation PRs still require their own reviews and delivery gates.

### Deferred conditions
- None.

### Optional improvements
- None.

## Round 2 — 2026-10-01 · scope: feature-complete specification
- **Code review:** n/a — no Git repository or implementation yet
- **Spec review:** spec path `docs/specs/2026-10-01-tip-calculator-design.md` · version `1.1` · hash (`git hash-object`) `2798f136a6ceb27144c12ebc3398b3c6448c0c35`

**Verdict:** Revision required
**Model used:** GPT-6 · **Switch model next step?** No — the remaining work is a focused spec revision.

### Findings

### [P1] Config parsing can pass money and tip values through JavaScript numbers
- Category: guardrail mismatch
- Rule: MON-01 (hard), MON-03; spec D5
- Evidence: `docs/specs/2026-10-01-tip-calculator-design.md:26` forbids `number` and `JSON.parse` for amounts, tip percentages and people counts. Lines 39-49 define an exact parser only for the HTTP body. Lines 125-143 define numeric values in `config/app.json`, including `maxBillCents`, `allowedTipPercents` and `maxPeople`, while M1 at line 148 calls only for a generic config loader and validation tests.
- Failure scenario: M1 loads `config/app.json` with `JSON.parse`, turning the bill cap, tip values and people cap into JavaScript numbers before validation. The HTTP parser and money module can still pass their stated tests while D5 and MON-01 are violated.
- Why it matters: The exact-integer promise must cover configuration values that control money calculations, not just request bodies.
- Required correction: Specify how the config loader reads the numeric bill cap, tip values and people cap without a JavaScript `number` intermediate, and add an M1 check that verifies this path. Preserve exact integer types through comparison with request values.
- Owner: builder
- Verification: Inspect the revised config contract and M1 acceptance tests, then check the loader implementation during M1 review.
- Status: open

### [P1] Environment settings have no M1 runbook requirement
- Category: guardrail mismatch
- Rule: UNI-16
- Evidence: `docs/specs/2026-10-01-tip-calculator-design.md:128-140` introduces `HOST` and `PORT` overrides and their validation. M1 at line 148 adds the config loader and server factory but does not include a runbook for startup and environment configuration.
- Failure scenario: M1 is merged with working overrides but no operator instructions for setting them, checking the local-only default, or diagnosing invalid startup config.
- Why it matters: The required runbook must ship with the environment-variable change, not after it.
- Required correction: Add an M1 runbook deliverable and acceptance check covering config file location, `HOST`/`PORT` overrides, startup failure behavior and a smoke test. Review the runbook with the M1 PR.
- Owner: builder
- Verification: Check the revised M1 milestone and inspect the runbook in M1 code review.
- Status: open

### Prior-round disposition
| Round 1 finding | Round 2 result | Evidence |
|---|---|---|
| Money values use floating-point representation | Resolved for the HTTP request, calculation and response; configuration path remains open above | Spec D5 and §4, lines 26 and 39-54 |
| Currency configuration assumes a two-decimal exponent | Resolved | Spec D4 and config rule, lines 25 and 135; wrong-currency test at line 120 |
| Configurable resource limits have no enforced ceilings | Resolved | Spec §8, lines 136-143; boundary tests at line 148 |
| Scaffold milestone omits required delivery checks | Resolved | Spec M1, line 148 includes lockfile and CI gates |
| Three product decisions remain open | Resolved in the spec | Spec D11-D13 and §10, lines 32-34 and 168-169 |

### Self-check audit
`PROJECT.md` is still an unfilled template; its identity, paths, model tiers, commands, guardrail ticks and project-specific constraints could not be used. There is no implementation diff or builder self-check table yet. Applicability for this stateless API: UNI-01, UNI-02, UNI-03, UNI-06, UNI-07, UNI-13, UNI-14, UNI-16 and UNI-19; MON-01, MON-02, MON-03, MON-04, MON-05 and MON-07. UNI-17 is not applicable to a JSON-only loopback API with no browser UI; UNI-18 has no cookies. Remaining rules have no relevant operation in this spec.

### Verification performed
| Command / check | Result |
|---|---|
| Read spec v1.1, prior review, `PROJECT.md`, decisions log, handoff, reviewer role, universal and money guardrails | Complete; decisions log has no entries and `PROJECT.md` is unfilled |
| `git hash-object docs/specs/2026-10-01-tip-calculator-design.md` | `2798f136a6ceb27144c12ebc3398b3c6448c0c35` |
| Recheck worked examples and ceiling arithmetic | Listed shares sum to totals; 10^12 × 100 + 50 = 100000000000050, within `bigint` range |
| `git status --short` | Unavailable: this directory is not yet a Git repository |
| CI, typecheck, tests, runtime and runbook | Unavailable: no implementation or runbook exists |

### Residual risks and test gaps
- The proposed custom JSON parser and encoder are not implemented; their behavior remains unverified.
- The owner decisions D11-D13 are recorded in the revised spec and handoff, but `PROJECT.md` has not yet been reconciled.

### Required before merge
- Resolve both P1 findings in another spec version and request another spec review.

### Deferred conditions
- None.

### Optional improvements
- None.

## Round 1 — 2026-10-01 · scope: feature-complete specification
- **Code review:** n/a — no Git repository or implementation yet
- **Spec review:** spec path `docs/specs/2026-10-01-tip-calculator-design.md` · version `1.0` · hash (`git hash-object`) `115e9556abb7872fd88496abef47c82a3bf2c761`

**Verdict:** Revision required
**Model used:** GPT-6 · **Switch model next step?** No — the next step is to resolve money and configuration requirements in the spec.

### Findings

### [P1] Money values use floating-point representation
- Category: guardrail mismatch
- Rule: MON-01 (hard), MON-03
- Evidence: `docs/specs/2026-10-01-tip-calculator-design.md:36-40` defines cents as a JavaScript `number`; lines 42-65 put amounts in JSON number fields. `agents/guardrails/money.md` requires an exact integer representation and says amounts must never pass through floating point in code or JSON.
- Failure scenario: A builder follows the explicit JavaScript `number` and JSON-number contract, satisfying the spec while violating the money guardrail. The safe-integer cap proves arithmetic precision for the stated range but does not make JavaScript `number` an integer representation.
- Why it matters: The implementation contract and a hard guardrail disagree on the central money data type.
- Required correction: Specify an exact integer representation throughout computation and transport, including request parsing and response serialization; update the request and response examples and tests accordingly. If the owner intends to keep JSON numbers, the kit's money rule must be changed outside this reviewer role before approval.
- Owner: builder; owner for any change to the guardrail
- Verification: Inspect the revised data contract and examples against MON-01 and MON-03, then check tests for the chosen parser and serializer.
- Status: open

### [P1] Currency configuration assumes a two-decimal exponent
- Category: guardrail mismatch
- Rule: MON-02
- Evidence: `docs/specs/2026-10-01-tip-calculator-design.md:25` fixes USD and exponent 2; lines 119-120 permit a configurable currency code but require exponent 2 without defining an exponent table. The config failure list at line 89 does not say that non-USD codes are rejected.
- Failure scenario: `currency` is changed to a code with a different exponent while amounts are still labelled cents and returned with that code.
- Why it matters: The API can mislabel money units, and the spec conflicts with the currency exponent table requirement.
- Required correction: Define the permitted currency code(s), derive and validate each exponent from a currency exponent table, and reject inconsistent config at startup. For the intended USD-only API, state and test that any non-USD code is rejected.
- Owner: builder
- Verification: Check the revised config schema and tests for non-USD and exponent mismatch cases.
- Status: open

### [P1] Configurable resource limits have no enforced ceilings
- Category: material risk
- Rule: spec §§4, 7-8; UNI-03
- Evidence: `docs/specs/2026-10-01-tip-calculator-design.md:105` relies on `maxBodyBytes = 1024` and `maxPeople = 100` to bound work, but lines 122-123 make both configurable without valid ranges or hard ceilings. Line 89 describes only partial startup validation.
- Failure scenario: A mistyped or changed `maxPeople` allows a request to allocate a very large `sharesCents` array; a large `maxBodyBytes` removes the stated request-size bound.
- Why it matters: The threat-model controls are only defaults, so the claimed resource bounds do not hold for every valid configuration.
- Required correction: Define and validate upper and lower bounds for both values and test the boundary and over-bound cases. Specify validation of `HOST` and `PORT` overrides as part of the startup config contract. Update the arithmetic bound in §4 to account for the allowed 100% tip and configurable `maxBillCents`, rather than only the default 20% case.
- Owner: builder
- Verification: Check the revised config constraints and startup tests at each boundary; recompute the maximum intermediate value from the allowed limits.
- Status: open

### [P1] Scaffold milestone omits required delivery checks
- Category: guardrail mismatch
- Rule: UNI-13, UNI-14
- Evidence: `docs/specs/2026-10-01-tip-calculator-design.md:130-133` defines M1 completion using config tests, typecheck and lint. It does not require a committed lockfile or CI with a production build, dependency audit and secret scan.
- Failure scenario: M1 is declared done and merged with passing local tests while the required delivery gates do not exist.
- Why it matters: The first implementation PR establishes the project workflow and dependencies; omitted gates can persist into M2.
- Required correction: Add the lockfile and required CI checks to M1's scope and acceptance criteria, with failing checks blocking merge.
- Owner: builder
- Verification: Review the revised M1 acceptance criteria, then inspect CI and the lockfile during M1 code review.
- Status: open

### [P2] Three product decisions remain open after the spec chooses defaults
- Category: spec/guardrail mismatch
- Rule: spec §§4, 9-10
- Evidence: `docs/specs/2026-10-01-tip-calculator-design.md:149-152` asks the owner to confirm zero-bill behavior, maximum bill and group size, and the absence of a health endpoint, while lines 14, 48, 121-122 already set those choices.
- Failure scenario: One builder treats the current values as approved requirements; another waits for an owner answer or changes them during implementation.
- Why it matters: These choices affect the API contract and acceptance tests.
- Required correction: Record the owner's answers and make §10 consistent with the final request limits and endpoint scope before build.
- Owner: owner, then builder
- Verification: Compare the recorded owner answers with §§2, 4, 8 and 9 in the next version.
- Disposition: before merge
- Status: open

### Self-check audit
The repository has no implementation diff or builder self-check table. `PROJECT.md` remains an unfilled setup template, so its identity, paths, model tiers, commands, guardrail ticks and project-specific constraints could not be used. Applicability was derived from this spec and the kit: UNI-01, UNI-02, UNI-03, UNI-06, UNI-07, UNI-13, UNI-14, UNI-16 and UNI-19; MON-01, MON-02, MON-03, MON-04, MON-05 and MON-07. The remaining universal and money rules have no relevant operation in this stateless, database-free API. Code-level verification belongs to the later PR reviews.

### Verification performed
| Command / check | Result |
|---|---|
| Read spec, `PROJECT.md`, decisions log, handoff, reviewer role, universal and money guardrails | Complete; decisions log has no entries, `PROJECT.md` is unfilled, handoff identifies spec v1.0 |
| `git hash-object docs/specs/2026-10-01-tip-calculator-design.md` | `115e9556abb7872fd88496abef47c82a3bf2c761` |
| Check worked examples against D7-D8 | The listed tip, total and share values are arithmetically consistent |
| `git status --short` | Unavailable: this directory is not yet a Git repository |
| CI, typecheck, tests, browser, deployment | Unavailable: no implementation or CI exists |

### Residual risks and test gaps
- Current-library behavior and implementation error mapping are unverified because no code or project dependencies exist.
- The spec's `maxBillCents * 20 + 50` example is based on defaults; the allowed configuration permits a 100% tip and a larger bill.

### Required before merge
- Resolve all P1 findings and the P2 finding marked before merge in a revised spec, then request another spec review.

### Deferred conditions
- None.

### Optional improvements
- None.
