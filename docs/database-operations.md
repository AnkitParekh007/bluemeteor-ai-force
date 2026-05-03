# Database operations

Run Prisma commands from `server/` with the correct `DATABASE_URL`.

## Common commands

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

## Pilot feedback table

The `pilot_feedback` model stores internal pilot submissions. Apply schema changes through migrations in shared environments.

See also [`deployment-guide.md`](deployment-guide.md).
