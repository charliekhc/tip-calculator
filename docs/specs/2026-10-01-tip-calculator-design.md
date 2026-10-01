# Tip calculator API — design

- Date: 2026-10-01 · Author: builder · Status: draft (v1.2, revised after spec review round 2)
- Version: 1.2
- Supersedes: 1.1

## 1. Goal
A small HTTP API for one user. The caller sends a bill amount, a tip percentage and a number of people.
The API returns what each person pays. The server does all the money maths. No login. No database.

## 2. Non-goals
- No login, no users, no sessions.
- No database. No stored history. The API keeps no state.
- No other endpoints. There is no `GET /health` (owner decision, D13).
- No other currency than USD. No FX.
- No tax, no service fee, no uneven splits (every person pays an equal share, ±1 cent).
- No UI.

## 3. Decisions
| # | Decision | Why | Alternatives rejected |
|---|---|---|---|
| D1 | Language and runtime: TypeScript (strict mode) on Node 22 LTS. | Owner's choice. | — |
| D2 | Framework: Fastify. | Minimal. Built-in `inject()` for tests without a network. | Express, plain `http` |
| D3 | Test runner: Vitest. | Fast, TypeScript works with no extra setup. | Jest |
| D4 | One currency: `USD`, exponent 2. The exponent comes from a currency exponent table in code (`src/money/currency.ts`), which holds only `USD: 2` in v1. The config `currency` must be a key of that table, and in v1 it must be `"USD"`. The request has no currency field. | Owner's choice. MON-02: never assume decimals; derive them from a table. | Caller sends currency; free-form code in config |
| D5 | Amounts are integer minor units (cents). The request and response carry them as plain JSON integers (for example `12050`). **Exact integer representation: `bigint` in all code, from the raw request text to the response text.** No amount, tip percent, people count or money-related config value (bill cap, tip list, people cap) ever becomes a JavaScript `number` or passes through `JSON.parse` or `JSON.stringify`. The request body and `config/app.json` are both read by one shared exact reader. See §4. | MON-01 (hard), MON-03. Owner chose integer cents in the request. | JSON numbers parsed as `number` (breaks MON-01); decimal strings |
| D6 | Tip is computed on the bill amount only. | Simplest rule. | Tip on bill plus tax (no tax here) |
| D7 | Tip rounding: half up to the nearest cent, in `bigint` maths: `tipCents = (billCents * tipPercent + 50n) / 100n` (integer division, values never negative). The rule lives in one module: `src/money/split.ts`. | MON-04. Values are never negative, so half up equals half away from zero. | Banker's rounding |
| D8 | Splitting the total: `total = bill + tip`. `base = total / people`. `rem = total % people`. The first `rem` people pay `base + 1`. The rest pay `base`. Shares always add up to `total` exactly. | Owner's choice. Nobody over- or under-pays. | Round each share up |
| D9 | `tipPercent` must be one of the allowed values in config: `[0, 10, 15, 20]`. Any other value gets `400`. | Owner's requirement. | Hardcode the list |
| D10 | The server binds to `127.0.0.1` by default. | Single user, no login. Do not expose it to the network by accident. | Bind to `0.0.0.0` |
| D11 | A bill of 0 is rejected: `billCents >= 1`. | Owner decision 2026-10-01. A zero bill has nothing to split. | Accept zero |
| D12 | Default limits: max bill 1,000,000.00 (`100000000` cents), max 100 people. Both are config values with hard ceilings (§8). | Owner decision 2026-10-01. | Other numbers |
| D13 | Only `POST /split`. No health endpoint. | Owner decision 2026-10-01. | `GET /health` |

## 4. Data model
No database. The only data is the request, the response, and the config file.

**Money representation (MON-01, MON-03):** `bigint` end to end (D5).
- **Exact reader (shared).** One module, `src/json/exact-json.ts`, reads JSON text. It is a small tokenizer,
  not `JSON.parse`. It returns strings as strings, arrays, objects, booleans and `null` as usual, and every
  integer literal as a `bigint`. It reads each number as raw text and accepts it only if it matches
  `^-?(0|[1-9][0-9]*)$`. Any `.` or exponent (`e`/`E`) in a number gives an error. A number longer than
  18 digits gives an error before conversion. Duplicate object keys give an error. Both the HTTP body parser
  and the config loader (§8) use this reader and nothing else. `JSON.parse` is not used anywhere in `src/`
  (a lint rule or scan test enforces this, §7).
- **Parsing the request.** `src/http/parse-body.ts` passes the raw body text to the exact reader, then checks
  the shape. The body must be one object with exactly the three keys below, each an integer. A reader error,
  a non-integer value (string, boolean, `null`, array, object), an unknown key or a missing key gives
  `400 INVALID_BODY`. Otherwise the range checks below apply to the `bigint` values. So `9007199254740993`
  is judged as exactly that value, never rounded.
- **Parsing the config.** `src/config/load.ts` passes the raw text of `config/app.json` to the same exact
  reader. `maxBillCents`, `maxPeople` and every entry of `allowedTipPercents` stay `bigint` from the file to
  the checks in §8, and into `split()` and the request validation. Comparisons with request values are
  `bigint` to `bigint`. `HOST` and `PORT` overrides are text; `PORT` is checked with `^[0-9]+$` and then
  converted with `BigInt()`. After all checks pass, only two non-money values are converted to `number`, and
  only at the framework call: `port` (for `listen`) and `maxBodyBytes` (for Fastify's `bodyLimit`). Nothing
  else is converted.
- **Calculation.** `bigint` only (D7, D8). No `Number()`, no `parseFloat`, no `Math.*` on money.
- **Serialization.** The response is written by a small encoder in `src/http/encode.ts`. It writes each
  `bigint` as its decimal digits, as a plain JSON integer. It does not use `JSON.stringify` on any number.
  Strings (`currency`, error text) are escaped by the encoder.
- **Range.** Amounts are `0` to `maxBillCents * 2` (the largest total is a 100% tip). With the hard ceilings in
  §8 the largest values are: `billCents * tipPercent` ≤ 10^12 × 100 = 10^14, plus 50; `totalCents` ≤ 2 × 10^12;
  `sharesCents` has at most 1000 entries. All of these are far below any `bigint` limit, and also exact as
  decimal text.

**Request** — `POST /split`, `Content-Type: application/json`:
```json
{ "billCents": 12050, "tipPercent": 15, "people": 3 }
```
| Field | Type | Rule |
|---|---|---|
| `billCents` | integer literal | `1` to `maxBillCents` |
| `tipPercent` | integer literal | one of `allowedTipPercents` |
| `people` | integer literal | `1` to `maxPeople` |

**Response** — `200`:
```json
{
  "currency": "USD",
  "billCents": 12050,
  "tipPercent": 15,
  "tipCents": 1808,
  "totalCents": 13858,
  "people": 3,
  "sharesCents": [4620, 4619, 4619]
}
```
`sharesCents` has exactly `people` entries, largest first. The sum of `sharesCents` equals `totalCents`.

**Error response** — `400`, `415` or `500`:
```json
{ "error": { "code": "INVALID_TIP_PERCENT", "message": "tipPercent must be one of 0, 10, 15, 20" } }
```
Error codes: `INVALID_BODY`, `INVALID_BILL`, `INVALID_TIP_PERCENT`, `INVALID_PEOPLE`, `UNSUPPORTED_MEDIA_TYPE`, `INTERNAL`.
The `message` for `INVALID_TIP_PERCENT` is built from the config list, never from a hardcoded string.

## 5. Flows
**Happy path**
1. Client sends `POST /split` with a JSON body.
2. Server checks the body size and content type.
3. The strict parser reads the body (§4). Server validates every field against §4 and config (§8).
4. `split()` computes tip, total and shares (D7, D8).
5. The encoder writes the `200` response.

**Failure paths**
- Wrong content type → `415 UNSUPPORTED_MEDIA_TYPE`.
- Body larger than `maxBodyBytes`, bad JSON, wrong or non-integer value, missing, duplicate or unknown field → `400 INVALID_BODY`.
- Value out of range or not allowed → `400` with the field's code (`INVALID_BILL`, `INVALID_TIP_PERCENT`, `INVALID_PEOPLE`).
- Any other method or path → `404` or `405` (framework default).
- Unexpected exception → `500 INTERNAL`. The message is generic. No stack trace goes to the client.
- Bad config at startup → the process exits with a non-zero code and a clear message. It never starts with a half-valid config. "Bad config" means any rule in §8 fails, for the file or for an environment override.

No retries. The endpoint is a pure function of its input, so a client can retry safely.

## 6. Permissions
| Role | Action | Allowed |
|---|---|---|
| Anyone who can reach the server | `POST /split` | Yes (no login, by design; D10 limits who can reach it) |

## 7. Threat model
| Threat | Control (with concrete numbers) | How it's tested |
|---|---|---|
| Float or precision error gives wrong cents | `bigint` end to end (D5). Shared exact reader for body and config, custom encoder. No `number` for money or money-related config. | Unit tests: 1 cent, max bill, 3 people on `10000`. Test that `9007199254740993` is rejected as out of range, not rounded to `…992`. Config tests: the loaded `maxBillCents`, `maxPeople` and each `allowedTipPercents` entry have `typeof === 'bigint'`; a config with `maxBillCents` `9007199254740993` is rejected as over the ceiling, and the error text shows exactly those digits; `1000000000000.0` and `1e12` are rejected. Test that `12050.0`, `1e3`, `1.5`, `"12050"`, `true`, `null` give `400 INVALID_BODY`. Property test that shares sum to total. A test (or lint rule) that scans `src/` for `JSON.parse`, and `src/money/`, `src/http/`, `src/json/` and `src/config/` for `Number(`, `parseFloat` and `Math.`, with only the two `port` and `maxBodyBytes` conversions allowed in one named file |
| Client sends a negative, huge number or extra fields | Strict parser plus range checks: `1..maxBillCents`, `1..maxPeople`, allowed tip list. Unknown keys rejected. Literals over 18 digits rejected. | Integration tests for each bad input; expect `400` and the right code |
| Client picks a tip not in the list | Server checks the value against config `allowedTipPercents`. | Test `5`, `-10`, `100`, `15.5`, `"15"`, missing |
| Divide by zero | `people >= 1` is checked before any division. | Test `people: 0` → `400` |
| Memory or CPU abuse by a large body or huge `people` | Hard ceilings checked at startup: `maxBodyBytes` ≤ 4096, `maxPeople` ≤ 1000, so a response has at most 1000 shares (about 15 KB). | Startup tests at each boundary (§9 M1). Request tests: body over `maxBodyBytes` → `400`; `people: maxPeople + 1` → `400` |
| Client values trusted (MON-07) | Server recomputes tip, total and shares. The request carries only inputs. | Test that extra fields like `tipCents` are rejected |
| Tip values hardcoded in code | Allowed list read only from config. | Test that changes the config list to `[0, 5]` and checks `5` is accepted and `10` is rejected, with no code change |
| Wrong currency or exponent labels money | Currency must be `USD`; exponent comes from the table (D4). | Config tests: `"EUR"`, `"JPY"`, `"usd"`, `""`, missing → startup fails |
| Information leak in errors | Generic `500` message. No stack traces. | Test that forces an exception and checks the body |
| Exposed to the network by accident, or bad `HOST`/`PORT` | Default bind `127.0.0.1` (D10). `HOST` and `PORT` overrides are validated (§8). | Config tests for default host and for each bad override |
| Secrets in the repo | There are no secrets. The service has none. | Secret-scan step in CI (§9 M1) |

## 8. Configurable values
All values live in `config/app.json`. It is read once at startup with the exact reader (§4) and validated. Integers stay `bigint`. Nothing below is hardcoded in `src/`
(except the currency exponent table, D4, which is a fact table and not a business value).
Environment variables `HOST` and `PORT` may override `host` and `port`. Nothing else is overridable.
**Every value, from the file or from an environment variable, must pass its rule below, or startup fails.**
Environment values are text; `PORT` must match `^[0-9]+$` before it is checked as an integer.

| Key | Default | Rule (startup fails if broken) |
|---|---|---|
| `allowedTipPercents` | `[0, 10, 15, 20]` | Non-empty list of 1 to 101 unique integers, each `0` to `100`. |
| `currency` | `"USD"` | Exactly `"USD"` in v1, and a key of the currency exponent table. |
| `maxBillCents` | `100000000` | Integer `1` to `1000000000000` (10^12). |
| `maxPeople` | `100` | Integer `1` to `1000`. |
| `maxBodyBytes` | `1024` | Integer `64` to `4096`. |
| `host` | `"127.0.0.1"` | A valid IPv4 or IPv6 literal, or `"localhost"`. |
| `port` | `3000` | Integer `1` to `65535`. |

Unknown keys in the file also fail startup. Floats, strings where a number is expected, and missing keys fail startup.
(Missing keys do not fall back to defaults; the file must be complete.)

## 9. Milestones
| # | Scope | Done when (testable) |
|---|---|---|
| M1 | Scaffold: `git init`, `package.json`, **committed `package-lock.json`**, Node version pinned (`.nvmrc` and `engines`), tool versions pinned exactly (no `latest`), strict `tsconfig`, Vitest, lint, config loader with validation, `config/app.json`, currency table, Fastify app factory with no routes, the shared exact reader `src/json/exact-json.ts`, the **runbook** `docs/runbooks/tip-calculator.md`, and **CI** (`.github/workflows/ci.yml`, actions pinned by version or commit SHA). CI runs: `npm ci`, typecheck, lint, tests, production build (`npm run build`), dependency audit (`npm audit --audit-level=high`) and the secret scan from `PROJECT.md` §7. There is no container image, so no image scan. | `npm test` passes the config tests: the valid file loads; each bad config fails with a clear message, at each boundary: missing file, missing key, unknown key, empty tip list, tip `5.5`, `-1`, `101`, duplicate tip values, `currency` not `USD`, `maxPeople` `0` / `1000` (ok) / `1001`, `maxBodyBytes` `63` / `64` (ok) / `4096` (ok) / `4097`, `maxBillCents` `0` / `10^12` (ok) / `10^12 + 1`, bad `HOST` (`""`, `"a b"`), bad `PORT` (`"0"`, `"65536"`, `"abc"`, `"80.5"`). Exact-reader tests: integer literals come back as `bigint`; `1.5`, `1.0`, `1e3`, a 19-digit literal and duplicate keys are errors; `9007199254740993` comes back as exactly `9007199254740993n`. Config loader tests: the loaded money-related values have `typeof === 'bigint'` (see §7); the `JSON.parse` scan passes. **Runbook** is in the M1 PR and reviewed with it. It covers: where `config/app.json` is, every key and its rule (copy of §8), the `HOST` and `PORT` overrides and their rules, the local-only default (`127.0.0.1`), what a failed startup looks like (non-zero exit and a message naming the bad key) and how to fix it, and a smoke test: start with the default config, then `curl -i http://127.0.0.1:3000/split` returns `404` in M1 (no route yet), and a second start with `PORT=abc` exits non-zero. Typecheck, lint, build, audit and secret scan all pass locally via npm scripts. The lockfile is committed. When the owner creates the remote, CI runs green on the M1 PR and the owner makes the CI check required for merge (a failing check blocks merge, UNI-13). M1 is not done until both are true. |
| M2 | `src/money/split.ts` (tip and split, D7 and D8), `src/http/parse-body.ts` (built on the exact reader from M1), `src/http/encode.ts`, and `POST /split` with validation, error shapes, body limit. | All unit tests for `split()` pass, including the property test (shares sum to total, shares differ by at most 1 cent, shares sorted largest first). All parser and encoder tests in §7 pass. All integration tests in §7 pass through `app.inject()`. A manual `curl` with `{"billCents":12050,"tipPercent":15,"people":3}` returns the §4 example exactly. The runbook smoke test is updated to use that `curl` and its expected output. CI is green. |

M1 and M2 are each one PR, under the PR size target.

**Worked examples that must pass as tests**
| bill | tip % | people | tip | total | shares |
|---|---|---|---|---|---|
| 10000 | 0 | 1 | 0 | 10000 | [10000] |
| 10000 | 10 | 3 | 1000 | 11000 | [3667, 3667, 3666] |
| 12050 | 15 | 3 | 1808 | 13858 | [4620, 4619, 4619] |
| 1 | 20 | 2 | 0 | 1 | [1, 0] |
| 5 | 10 | 1 | 1 | 6 | [6] |
| 100000000 | 20 | 100 | 20000000 | 120000000 | 100 × 1200000 |
| 1000000000000 | 100 | 1000 | 1000000000000 | 2000000000000 | 1000 × 2000000000 (test config: `allowedTipPercents` includes `100`, `maxBillCents` = 10^12, `maxPeople` = 1000) |

(Check for row 12050 at 15%: 12050 × 15 = 180750; +50 = 180800; ÷100 = 1808. Total 13858. 13858 ÷ 3 = 4619 rem 1.)
(Check for row 5 at 10%: 5 × 10 = 50; +50 = 100; ÷100 = 1.)
(Check for row 1 at 20%: 1 × 20 = 20; +50 = 70; ÷100 = 0.)

## 10. Open questions
None. The owner answered the three product questions on 2026-10-01 (D11, D12, D13).
