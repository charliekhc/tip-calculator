# Runbook — tip calculator API

Local, single-user service. No login, no database. Spec: `docs/specs/2026-10-01-tip-calculator-design.md`.

## Start

```bash
nvm use            # Node 22 or newer (.nvmrc)
npm ci
npm run build
npm start          # runs dist/server.js
```

The server listens on `127.0.0.1:3000` by default. It is not reachable from other machines unless you change `host`.

## Configuration

All settings are in `config/app.json`. The file is read once at startup. Every key is required. Unknown keys are an error.
Integers must be plain integer literals (`100`, not `100.0` or `1e2`).

| Key | Rule |
|---|---|
| `allowedTipPercents` | 1 to 101 unique integers, each 0 to 100 |
| `currency` | exactly `"USD"` |
| `maxBillCents` | integer 1 to 1000000000000 |
| `maxPeople` | integer 1 to 1000 |
| `maxBodyBytes` | integer 64 to 4096 |
| `host` | IPv4 or IPv6 address, or `"localhost"` |
| `port` | integer 1 to 65535 |

### Environment overrides

Only these two. Each follows the same rule as its key above. An empty value is an error, not "unset".

| Variable | Overrides | Example |
|---|---|---|
| `HOST` | `host` | `HOST=127.0.0.1 npm start` |
| `PORT` | `port` | `PORT=8080 npm start` |

`PORT` must be digits only (`8080`, not `80.5` or `abc`).

## If startup fails

The process prints `Startup failed: <message>` and exits with a non-zero code. The message names the bad key and the rule it broke.
Fix the value in `config/app.json` (or the environment variable), then start again. The server never starts with a half-valid config.

## Smoke test (M1: no routes yet)

1. Start with the default config: `npm start`.
2. In another terminal: `curl -i http://127.0.0.1:3000/split` returns `404`.
3. Stop the server. Start with a bad port: `PORT=abc npm start`. It exits with a non-zero code and prints a message naming `PORT`.
