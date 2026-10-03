# Decisions log

<!-- Committed. Newest at the top. One entry per decision. A settled decision is reopened only by the owner. -->

## 2026-10-02 — Hardcoded 15% tip (owner-requested test, PR 3 only)
- **Decision:** SUPERSEDED 2026-10-03: the hardcode is reverted in the working tree after review PR-3 round 2 (P0, P1). Original text follows. `src/http/parse-body.ts` ignores the request's `tipPercent` and always uses `HARDCODED_TIP_PERCENT = 15`, a `number` converted with `BigInt()`. The `allowedTipPercents` check is removed from the parser. 13 tests that expect the spec behaviour fail and are left failing. `ci` fails on this PR.
- **Why:** The owner asked for it as a deliberate test.
- **Alternatives rejected:** Hardcoding the allowed list in code (owner chose to ignore the request value); rewriting the 13 tests to pass (would hide the change).
- **Scope / affects:** `src/http/parse-body.ts`; breaks MON-01 (hard), `PROJECT.md` §9 architecture and config rule, spec tip rules. Must not merge in this state.
- **Versions:** none
- **Exception to a rule?** MON-01 (hard), `PROJECT.md` §9. Compensating control: none; PR 3 is unmergeable while tests fail. Review date: at `review 3`.
- **Decided by:** owner

## 2026-10-01 — Runbook shows the real multi-line response
- **Decision:** The runbook's expected `POST /split` response is the multi-line text the server sends (spec §4 layout, no final newline). The smoke test checks status `200` and a line-for-line match.
- **Why:** Review PR-2 round 1 (P2): the one-line example could never match the server bytes, so a healthy server looked broken. UNI-16.
- **Alternatives rejected:** Compare parsed JSON values only (looser; the strict byte layout is part of the spec).
- **Scope / affects:** `docs/runbooks/tip-calculator.md`; UNI-16.
- **Versions:** none
- **Exception to a rule?** no
- **Decided by:** owner (chose the real multi-line response)

## 2026-10-01 — M2 ships as one PR over the size target
- **Decision:** M2 is one PR of 740 added lines (210 in `src/`, 496 in `test/`, the rest docs), over the 400-line target.
- **Why:** The owner chose one PR over a split when offered both. The spec plans one PR per milestone, and a split would leave the money module and parser in a first PR that nothing calls yet.
- **Alternatives rejected:** Two PRs (the owner declined).
- **Scope / affects:** PR size target in `agents/PROJECT.md` §4, M2 only.
- **Versions:** none
- **Exception to a rule?** PR size target (400 LOC, `PROJECT.md` §4): compensating control is that the reviewer reads the PR in commit order (split, parser and encoder, route, docs); review date: M2 PR review.
- **Decided by:** owner

## 2026-10-01 — M2 request handling details where the spec was silent
- **Decision:** (1) The success and error bodies use the exact layouts in spec §4, written by `src/http/encode.ts` with no JSON library. (2) Any POST that is not read by the `application/json` parser, including one with no Content-Type and no body, gets `415 UNSUPPORTED_MEDIA_TYPE`. (3) All Fastify default content-type parsers are removed; one `application/json` parser hands the raw text to `parseBody`. (4) Three Fastify errors are mapped: invalid media type to 415, body too large and bad Content-Length to `400 INVALID_BODY`; everything else is `500 INTERNAL` with a generic message. (5) Only the 500 path is logged: one line `request failed` with the error name and code, nothing from the URL, query, headers, body or caller address. Expected 4xx answers and requests are not logged. (6) Body keys may arrive in any order; exactly three keys must be present. (7) `split()` throws `RangeError` for a negative bill or tip or fewer than one person, because the half-up formula is only defined for non-negative values; HTTP input cannot reach it because `parseBody` checks ranges first. (8) Field range checks run in the order bill, tip, people.
- **Why:** The spec fixes the contract but not these edges. Fastify's built-in JSON parser reads numbers as floats, which D5 and MON-01 forbid. The sanitized error line follows UNI-09 and the round 1 logging decision.
- **Alternatives rejected:** `JSON.stringify` for responses (floats, D5); logging 4xx answers (more log volume and more risk of caller data); returning 404 for a POST without Content-Type (the spec says wrong content type is 415).
- **Scope / affects:** `src/money/split.ts`, `src/http/parse-body.ts`, `src/http/encode.ts`, `src/app.ts`; MON-01, MON-03, MON-04, MON-07, UNI-03, UNI-09.
- **Versions:** fastify@5.12.5 (no new dependency)
- **Exception to a rule?** no
- **Decided by:** builder (deep-tier sub-agent drafted the code; builder reviewed, wrote and tested it); owner may reopen

## 2026-10-01 — Public repository with a clean history and a required `ci` check
- **Decision:** The project lives in a new public repository, `charliekhc/tip-calculator`. All commits use the owner's GitHub noreply address, and the local home path was removed from `agents/PROJECT.md`. The earlier private repository stays private and untouched. On the new repository `main` requires the `ci` status check, and the rule applies to administrators.
- **Why:** The private repository's plan cannot enforce a required check (GitHub returned HTTP 403), and the spec (§9 M1) and UNI-13 need a failing check to block merge. The owner chose a public repository and asked that the personal email not be public. GitHub keeps old commits reachable by hash after a force-push, so rewriting the old repository in place would not hide the email; a new repository does.
- **Alternatives rejected:** Upgrading to GitHub Pro (the owner chose public); rewriting history in place (old hashes stay viewable); keeping the personal email in commits (the owner declined).
- **Scope / affects:** `agents/PROJECT.md` §3 and §4; UNI-13; UNI-11 (the repository, its review files and the kit are now public).
- **Versions:** none
- **Exception to a rule?** no
- **Decided by:** owner

## 2026-10-01 — M1 ships as one PR over the size target; private GitHub repo
- **Decision:** M1 is one PR of about 1,113 added lines (excluding the lockfile), over the 400-line target. The remote was first a private GitHub repository, created by the builder at the owner's request; it was replaced by the public repository in the entry above.
- **Why:** The owner chose one PR over a split when offered both. The spec plans one PR per milestone. About 70% of the lines are tests.
- **Alternatives rejected:** Splitting M1 into two PRs (the owner declined).
- **Scope / affects:** PR size target in `agents/PROJECT.md` §4 (exception for M1 only); `agents/PROJECT.md` §4 remote.
- **Versions:** none
- **Exception to a rule?** PR size target (400 LOC, `PROJECT.md` §4): compensating control is the reviewer reads the PR in commit order (three logical commits); review date: M1 PR review.
- **Decided by:** owner

## 2026-10-01 — Exact reader and config loader details where the spec was silent
- **Decision:** `-0` is rejected. The 18-digit limit counts digits only (not the minus sign). Nesting depth limit is 32. Objects have a null prototype. Only space, tab, LF and CR count as whitespace (a BOM is rejected). Raw control characters in strings are rejected. `PORT` with leading zeros (`00080`) is accepted as 80. An empty `HOST` or `PORT` is invalid, not "unset". The currency exponent is the `bigint` `2n`. File `host` and `port` are validated even when `HOST` or `PORT` is set. Only `port` and `maxBodyBytes` become `number`, in one function, `toFrameworkNumber`, in `src/config/load.ts`; a test guards this.
- **Why:** The spec accepts a number only if it matches `^-?(0|[1-9][0-9]*)$`. It does not say every match must be accepted. One spelling per value keeps parsing predictable (MON-01, MON-03). Spec §8 says every value must pass its rule.
- **Alternatives rejected:** Accepting `-0` (two spellings for zero); treating an empty env value as unset (hides a mistake); a `number` exponent (a money-related value as a float type).
- **Scope / affects:** `src/json/exact-json.ts`, `src/config/load.ts`, `src/money/currency.ts`; MON-01, MON-02, MON-03, UNI-03.
- **Versions:** none
- **Exception to a rule?** no
- **Decided by:** builder (deep-tier sub-agent drafted the code; builder reviewed, wrote and tested it); owner may reopen

## 2026-10-01 — M1 toolchain and dependencies
- **Decision:** Runtime Node >=22.12 (`.nvmrc` 22). TypeScript 6.0.3 (exact). Fastify 5.12.5 (exact). Vitest 5.0.3, ESLint 10.11.0, `@eslint/js` 10.0.1, typescript-eslint 8.71.0, `@types/node` 22.20.4 (all exact, dev). CI actions pinned by commit SHA: `actions/checkout` v7.0.1, `actions/setup-node` v7.0.0.
- **Why:** Spec D1-D3. TypeScript 7.0.2 is the newest release but typescript-eslint 8.71.0 declares support only for `>=4.8.4 <6.1.0`, so TypeScript stays on 6.0.3.
- **Alternatives rejected:** TypeScript 7.0.2 (lint plugin unsupported); floating `^` ranges (UNI-14).
- **Scope / affects:** `package.json`, `package-lock.json`, `.github/workflows/ci.yml`; UNI-06, UNI-14.
- **Versions:** as listed above.
- **Dependency ladder (UNI-06).** Evidence from `npm view`, `npm audit` (0 vulnerabilities) and `npm audit signatures` on 2026-10-01: all 176 packages have verified registry signatures, 52 have verified provenance attestations, 0 invalid, 0 missing. "Size" is the unpacked size of the package itself. Install tree: 177 packages in total, 50 without dev tooling.

  | Package | Needed? Can the platform or an existing dependency do it? | Maintained (latest publish of the pinned version) | Size | Licence | Supply chain |
  |---|---|---|---|---|---|
  | `fastify@5.12.5` (runtime) | Yes, spec D2 asks for a minimal framework. Node's `http` alone would need hand-written routing, body limits and a test harness (`inject`). No existing dependency does this. Only runtime dependency. | Published 2026-09-16, `github.com/fastify/fastify` | 2.95 MB, 363 files | MIT | Registry signature verified; no provenance attestation; `npm audit` reports 0 vulnerabilities |
  | `typescript@6.0.3` (dev) | Yes, spec D1. Node cannot type-check. | Published 2026-04-16, `github.com/microsoft/TypeScript` | 24.3 MB | Apache-2.0 | Registry signature verified; no provenance attestation. Dev only; not in the production build output |
  | `vitest@5.0.3` (dev) | Yes, spec D3 names it. Node's built-in `node:test` could run tests but the spec chose Vitest for TypeScript support and `inject`-style app tests. | Published 2026-09-30, `github.com/vitest-dev/vitest` | 2.76 MB | MIT | Registry signature verified; provenance attestation present. Dev only |
  | `eslint@10.11.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.71.0` (dev tooling group) | Yes, UNI-01 and the exact-reader boundary (UNI-04) need lint rules enforced in CI. The TypeScript compiler cannot enforce import boundaries. | ESLint published 2026-09-18, typescript-eslint 2026-09-28, `github.com/eslint/eslint`, `github.com/typescript-eslint/typescript-eslint` | 2.95 MB, 15.7 KB, 42.7 KB | MIT | Registry signatures verified; provenance attestation present for `typescript-eslint` only (not for `eslint` or `@eslint/js`). Dev only |
  | `@types/node@22.20.4` (dev) | Yes, types for Node 22 APIs used in `src/` (`fs`, `net`, `url`). | Published 2026-09-25, `github.com/DefinitelyTyped/DefinitelyTyped` | 2.44 MB | MIT | Registry signature verified; no provenance attestation. Types only, no runtime code |

  Node's built-ins (`fs`, `net`, `bigint`) cover file reading, IP checks and exact maths, so no extra runtime package is added. `@eslint/js` and `@types/node` publish dates were not returned by the registry query; they are not recorded here.
- **Exception to a rule?** no
- **Decided by:** builder, following approved spec v1.2

## 2026-10-01 — Logging keeps request details out of the logs
- **Decision:** The Fastify logger drops raw request URLs, query strings and caller addresses. `src/app.ts` sets `logController: new LogController({ disableRequestLogging: true })`. `src/logging.ts` also serializes `req` to the method only and `res` to the status code only. M2 must add an error handler that logs a sanitized error (no URL, no query, no caller address); until then unexpected errors are not logged.
- **Why:** UNI-09. Review round 1 showed the default logger wrote the full URL and caller address, including for a 404.
- **Alternatives rejected:** `disableRequestLogging` as a top-level option (deprecated in Fastify 5.12, removed in 6); redaction paths only (cannot redact a value inside a URL string).
- **Scope / affects:** `src/app.ts`, `src/logging.ts`, `test/logging.test.ts`; UNI-09.
- **Versions:** fastify@5.12.5
- **Exception to a rule?** no
- **Decided by:** builder (review R1 fix)

## 2026-10-01 — Secret scan covers every file; exact-reader boundary enforced by lint
- **Decision:** `scripts/secret-scan.sh` has two layers. Layer 1 scans every file (including `agents/` and `package-lock.json`) for strings that look like real secrets (private key blocks, AWS and GitHub and Slack token shapes, `sk-` keys, quoted values assigned to secret-named variables). Layer 2 scans everything except `agents/`, the lockfile and the script itself for the base keywords in `PROJECT.md` §7. The script enters the scan root first, so exclusions (`.git`, `node_modules`, `dist`, `.agent`) apply only inside the root and a parent folder with one of those names cannot hide the tree. It prints only `path:line` and the layer, never the matched text, and a file it cannot read makes it fail instead of reporting clean. Tests in `test/secret-scan.test.ts` plant synthetic secrets in each area, under an `.agent` parent, with a space in the file name, and with an unreadable file; they expect failure and check the secret value is absent from the output. ESLint (`eslint.config.js`) allows `src/json/exact-json.ts` to be imported only from `src/config/load.ts` and `src/http/parse-body.ts`, allows file reading only in `src/config/load.ts`, and bans the `JSON` global, `globalThis.JSON`, other JSON/YAML readers, dynamic `import()` and `node:module` in `src/`. `test/boundaries.test.ts` proves each bypass fails lint.
- **Why:** UNI-07 (hard), UNI-13, UNI-04. The keyword-only scan with whole-folder exclusions could pass a secret in an excluded file. The boundary was only prose.
- **Alternatives rejected:** A third-party scanner (new dependency, UNI-06); scanning keywords in the kit docs (they describe secrets in words, so every run would fail).
- **Scope / affects:** `scripts/secret-scan.sh`, `eslint.config.js`, `test/secret-scan.test.ts`, `test/boundaries.test.ts`, `.gitignore`.
- **Versions:** none
- **Exception to a rule?** no. Known limit: lint cannot stop a hand-written parser inside an allowed file or a new tokenizer written from scratch; the reviewer still reads new parsing code.
- **Decided by:** builder (review R1 fix)

## 2026-10-01 — Repository baseline and commit trailer
- **Decision:** `git init -b main`. The first commit on `main` holds only the agent kit and the approved spec. It is local until the owner creates a remote. Feature work goes on branches. No commit trailer is used.
- **Why:** A PR needs a base commit. The owner asked to remove the commit trailer.
- **Alternatives rejected:** Putting the kit and spec inside the M1 PR (it would bury the M1 diff).
- **Scope / affects:** `agents/PROJECT.md` §4 (`Commit trailer: none`).
- **Versions:** none
- **Exception to a rule?** no
- **Decided by:** owner (trailer); builder (baseline commit)

<!-- entry format — setup copies only the lines above this one. Copy the block below for each new entry.
## <YYYY-MM-DD> — <short title>
- **Decision:**
- **Why:**
- **Alternatives rejected:**
- **Scope / affects:** <files, packages, rule IDs>
- **Versions:** <package@version, if any>
- **Exception to a rule?** <rule ID + compensating control + review date, or "no">
- **Decided by:** <owner / builder with owner approval>
-->
