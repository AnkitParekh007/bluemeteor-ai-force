# Enterprise runtime audit

## Deployment readiness phase

**Status:** Initial internal-pilot scaffolding is in place (PostgreSQL via Prisma postgres schema + migrations, Docker Compose, nginx + SSE-friendly proxy, health/readiness/metrics, structured logging hooks, ops dashboard, startup validation, global HTTP error shape).

## Completed (this phase)

- Dual database path: SQLite for dev (`prisma/schema.prisma`), PostgreSQL migrations under `prisma/postgres/migrations`.
- `STORAGE_ROOT`-aware paths and Docker volume for runtime files.
- `/health`, `/live`, `/ready`, `/metrics`, enhanced `/security/health`.
- Request logging middleware with `streamToken` query redaction in URLs.
- Angular `/ops` page and SSE URL double-prefix guard.
- Documentation: deployment, database, storage, observability.

## Remaining pilot blockers (typical)

- Harden **secrets management** (Vault / cloud secret store) instead of flat `.env` in shared VMs.
- **Backup automation** for PostgreSQL (cron + `pg_dump` or managed DB backups).
- **Image hardening**: non-root already in backend Dockerfile; consider distroless/minimal final stage and `npm prune` once `prisma` migrate is handled in CI.
- **Metrics**: expand counters (connector/MCP/browser) beyond DB aggregates + SSE in-memory stats.
- **Rate-limit** observability: wire throttler hits into `RuntimeMetricsService` if needed for SRE dashboards.

## Security note

Production startup validation rejects weak Postgres passwords, SQLite in production (unless `ALLOW_SQLITE_IN_PRODUCTION=true`), weak JWT/stream secrets, demo users, and permissive CORS. Review `server/src/config/startup-validation.service.ts` and `AppConfigService.validateAuthSecretsForProduction()` when changing env policy.
