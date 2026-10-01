# Decisions log

<!-- Committed. Newest at the top. One entry per decision. A settled decision is reopened only by the owner. -->

## 2026-10-01 — M1 ships as one PR over the size target; private GitHub repo
- **Decision:** M1 is one PR of about 1,113 added lines (excluding the lockfile), over the 400-line target. The remote is a new private GitHub repository `charliekhc/tip-calculator-api`, created by the builder at the owner's request.
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
- **Versions:** as listed above. Dependency ladder (UNI-06): Fastify is the one runtime dependency (spec D2); everything else is dev tooling. Node `fs`, `net` and `bigint` cover file reading, IP checks and exact maths with no extra package.
- **Exception to a rule?** no
- **Decided by:** builder, following approved spec v1.2

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
