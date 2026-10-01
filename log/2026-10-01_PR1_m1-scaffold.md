# PR 1 — feat: M1 scaffold, exact bigint reader and config loader

- **Merged:** 2026-10-01T03:42:55Z (GitHub) · **Merge commit:** a6add90a9be12f02042feddbcb219d1a34cbe568 · **Branch:** feat/m1-scaffold
- **Gate breaches:** none
- **Approval receipt:** `reviews/PR-1.receipt` on `agent-logs`, commit 30bea17c50c5dcc74fb492595ec64f9e8ad6ff59, written 2026-10-01T03:37:52Z (before the merge) for head 84b4df226b0b9dbf7d4c234bc9152c270e43750c and review-file hash bae3f4db1b4f7a28f09247f3c06c2724a07e8fae
- **Merge evidence:** `gh pr view 1` on `charliekhc/tip-calculator` reports state MERGED, merge commit a6add90, merged at 2026-10-01T03:42:55Z; `git merge-base --is-ancestor a6add90 origin/main` succeeded after fetch. Final PR head before merge 84b4df2 equals the reviewed head of round 4.
- **Drafted by:** Claude Sonnet 5.5 (builder); the exact JSON reader, config loader and currency table were drafted by a Claude Opus 5.5 sub-agent, then written and tested by the builder · **Final verdict:** Approved (round 4)
- **Spec:** `docs/specs/2026-10-01-tip-calculator-design.md` v1.2 · **Plan:** none · **Milestone:** M1 (scaffold)

## What changed
Scaffolded the TypeScript and Fastify project with exact-pinned tooling, a committed lockfile and CI (typecheck, lint, tests, build, audit, secret scan). Added the shared exact JSON reader (`src/json/exact-json.ts`, integers as `bigint`), the validated config loader (`src/config/load.ts`, `config/app.json`, `HOST`/`PORT` overrides), the USD currency table, a Fastify app factory with no routes and privacy-safe logging, a runbook, and decisions log entries. Lint and tests enforce the exact-reader boundary, and the secret scan covers every file.

## Why
Spec §9 M1. Money-related config values stay `bigint` from file to checks (D5, MON-01), and CI gates are in place before M2 adds the endpoint.

## Review rounds
Commit hashes in rounds 1 to 3 refer to the earlier private repository; the history was rewritten when the project moved to the public repository, and the code was identical apart from two docs files.
- R1: [P1] Default request logging records client-supplied personal data → request logging off, `req`/`res` serializers keep only method and status code
- R1: [P1] The CI check does not block merge → not fixable in code (private repository plan); resolved in R3/R4 by the owner
- R1: [P1] Secret scan excludes tracked areas → two-layer scan over every file, with fixture tests
- R1: [P1] Exact-reader architecture rule not enforced by tooling → ESLint import and global restrictions plus negative tests
- R1: [P1] Dependency decisions lack the full review → dependency ladder table per package in the decisions log
- R1: [P2] Currency lookup exported but unused → removed `exponentFor` until M2
- R2: [P1] A tip percentage is hardcoded outside configuration → removed `suggestedTipPercent` (this was a deliberate test commit requested by the owner; the reviewer caught it)
- R2: [P1] Secret-scan fixtures silently pass beneath the mandated review path → scan enters its root first, exclusions relative to it
- R2: [P1] Secret-scan failures print secret values into CI logs → output is path, line and layer only
- R2: [P1] The CI check still does not block merge → still open
- R3: [P1] The CI check still does not block merge → owner chose a public repository; `main` requires `ci` (strict, administrators included, no force-push, no deletion)
- R4: Approved, no findings

## Deferred conditions
none

## Decisions worth keeping
- All lasting decisions are in `docs/DECISIONS.md` on `main`: toolchain and versions (TypeScript 6.0.3 because typescript-eslint does not support 7.x), exact-reader details (`-0` rejected, 18-digit limit, depth 32), logging, secret scan and lint boundaries, M1 over the PR size target, and the public repository with a clean history.
- The project lives in the public repository `charliekhc/tip-calculator`. The earlier private repository `tip-calculator-api` is untouched and private.
- Commits use the owner's GitHub noreply address. There is no commit trailer.

## Follow-ups
- M2 must add an error handler that logs a sanitized error (no URL, query or caller address). Until then unexpected errors are not logged.
- A failing `ci` check was not induced to test the merge gate; a pending check showed the PR as blocked and the configuration was read back from GitHub.
- The builder wrote short-lived temp files outside the project folder during M1 (UNI-12, reported in the PR self-check). Keep temp files in the scratch folder.
- The decisions entry "Repository baseline and commit trailer" says the baseline commit stays local until a remote exists; it was pushed once to `main` with the owner's OK. A later reviewed PR may correct the wording.
- Local checks ran on Node 26; CI runs Node 22.

## Appendix — final review round
## Round 4 — 2026-10-01 · scope: slice (M1 scaffold)
- **Code review:** new public repository; base (merge base) `0fd7eed01fa01b7071fe6eb41337ed258e65ef28` · head `84b4df226b0b9dbf7d4c234bc9152c270e43750c` · head re-checked at end: yes
- **Spec review:** approved spec `docs/specs/2026-10-01-tip-calculator-design.md` · version `1.2` · hash `ee3c51544413a45c581a9dc1ce15a8231a66836a`

**Verdict:** Approved
**Model used:** GPT-6 · **Switch model next step?** No — the M1 slice is approved at this head; M2's money and HTTP behavior will also need deep-tier review.

### Findings
- None open for this M1 slice.

### Prior-round disposition
| Round 3 finding | Round 4 result | Evidence |
|---|---|---|
| `ci` did not block merge on the former private repository | Resolved in the new public repository | GitHub branch-protection API for `main` reports required context `ci`, `strict: true`, `enforce_admins: true`, force-push and deletion disabled. The `ci` check passed on the pinned head. |

The new history rewrites commit IDs. A tree comparison of the prior reviewed head `c3ec51a53e43da3043ac7f7fca5fac85d64ed909` and this head found no difference in `src/`, `config/`, `test/`, `scripts/`, `.github/`, package files, lint/typecheck configuration or the runbook. Only `agents/PROJECT.md` and `docs/DECISIONS.md` differ: the project root is now relative, the repository points to the public remote, and the owner decision is recorded. The published `main`, feature and `agent-logs` histories contain no author or committer address outside GitHub noreply addresses.

### Self-check audit
Applicable rules listed independently for this M1 diff: UNI-01 through UNI-07, UNI-09, UNI-11 through UNI-14, UNI-16, UNI-19; MON-01 through MON-03; and both `PROJECT.md` §9 architecture rules for the M1 portions. The current PR self-check covers these IDs. The code and tests are identical to the round 3 reviewed tree, and the changed UNI-13 `pass` claim is supported by the GitHub protection configuration. UNI-11's public repository exposure is an owner decision recorded in `docs/DECISIONS.md:5-12`. UNI-08, UNI-10, UNI-15, UNI-17 and UNI-18 have no matching feature in this JSON-only, database-free slice; MON-04 through MON-07 belong to M2. The reported historical UNI-12 temporary writes are not a change in this PR's pinned diff.

### Verification performed
| Command / check | Result |
|---|---|
| `git fetch origin`; Git host head; `git cat-file -e`; `git merge-base` | Pinned new head `84b4df226b0b9dbf7d4c234bc9152c270e43750c`, merge base `0fd7eed01fa01b7071fe6eb41337ed258e65ef28` |
| Three-dot diff inventory, commit log, `git diff --check`, old-vs-new tree comparison | 27 PR files, 14 commits, no whitespace errors; only two documentation files differ from the round 3 tree |
| `npm ci`; `npm run typecheck`; `npm run lint`; `npm test`; `npm run build`; `npm run secret-scan` | Passed in the detached checkout; 230/230 tests passed; secret scan clean |
| `npm run audit` | Passed: 0 vulnerabilities after network access; the initial sandbox run could not reach npm's advisory service |
| GitHub repository and branch-protection APIs | Repository public; `main` requires strict `ci`, applies to administrators, disallows force-push and deletion |
| GitHub PR status | Open; `ci` passed on the pinned head; merge state clean |
| Published-branch author and committer address check | 0 non-noreply addresses across `origin/main`, `origin/feat/m1-scaffold` and `origin/agent-logs` |
| `git status --porcelain --untracked-files=no` in the detached checkout; final Git host head | Checkout clean; head still `84b4df2` |

### Residual risks and test gaps
- Local checks ran on Node 26.3.0; the pinned GitHub CI job passed on its configured Node 22 environment.
- M2 request parsing, money calculation, response encoding and error logging remain outside this slice and require their own review. A failing or pending `ci` check was not induced; the required-check configuration was read directly from GitHub.

### Required before merge
- No code or gate corrections. The owner remains the merger; follow the kit's `approved 1` archival step before merging.

### Deferred conditions
- None.

### Optional improvements
- None.
