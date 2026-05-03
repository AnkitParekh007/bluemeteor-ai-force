# Deployment guide

## Overview

Bluemeteor AI Force ships as an Angular frontend and NestJS (`server/`) backend with Prisma. Docker-based deployment is described in the root `README.md` (PostgreSQL + nginx proxy).

## Database migrations

After pulling changes that touch `server/prisma/schema.prisma` (including `pilot_feedback`), run in `server/`:

```bash
npx prisma migrate dev
# or for controlled environments:
npx prisma migrate deploy
```

For local SQLite prototyping, `npx prisma db push` may be used — prefer migrations for shared environments.

## Pilot module

No extra services are required for the pilot hub: `POST /pilot/feedback` and related routes are part of the main API. Ensure JWT auth and CORS/proxy settings match your frontend `agentApiBaseUrl`.

## Related docs

- [`admin-console-guide.md`](admin-console-guide.md)
- [`internal-pilot-launch-plan.md`](internal-pilot-launch-plan.md)
- [`observability.md`](observability.md) (if present in your tree)
