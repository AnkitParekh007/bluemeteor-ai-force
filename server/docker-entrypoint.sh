#!/bin/sh
set -e
cd /app

if echo "${DATABASE_URL:-}" | grep -qi 'postgres'; then
  echo "Running Prisma migrate deploy (PostgreSQL)..."
  npx prisma migrate deploy --schema=prisma/postgres/schema.prisma
fi

exec node dist/main.js
