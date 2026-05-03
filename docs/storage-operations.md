# Storage operations

Runtime-generated files live under **`STORAGE_ROOT`** (default `storage` relative to the server cwd, or `/data/storage` in Docker).

## Directories

| Relative (default) | Purpose |
|--------------------|---------|
| `browser-screenshots` | Playwright / worker screenshots |
| `browser-videos` | Recorded video |
| `browser-traces` | Trace files |
| `browser-auth-states` | Authenticated session state (**never** expose via static HTTP) |
| `browser-profiles` | Session profiles |
| `playwright-results` | Test reports / output |
| `generated-tests` | Generated spec files |
| `logs` | Application logs (when file logging is enabled) |

Paths are configurable via env (see `server/.env.example`); values may be absolute or relative. Leading `storage/` in env values is stripped so paths stay under `STORAGE_ROOT`.

## Docker

Mount a named volume at `/data/storage` and set `STORAGE_ROOT=/data/storage`.

## Retention

`AppConfigService` exposes `browserAssetRetentionDays` / `testAssetRetentionDays` for cleanup jobs (see env `BROWSER_ASSET_RETENTION_DAYS`, `TEST_ASSET_RETENTION_DAYS`).

## Security

- Do not serve `browser-auth-states` as public static files.
- Screenshots and reports may contain sensitive UI data — restrict access at the network layer.
