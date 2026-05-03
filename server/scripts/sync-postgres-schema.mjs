/**
 * Single source of truth: prisma/schema.prisma (SQLite for local dev).
 * Writes prisma/postgres/schema.prisma for Docker / PostgreSQL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sqlitePath = path.join(root, 'prisma', 'schema.prisma');
const outDir = path.join(root, 'prisma', 'postgres');
const outPath = path.join(outDir, 'schema.prisma');

const raw = fs.readFileSync(sqlitePath, 'utf8');
const pg = raw.replace(
	/datasource db\s*\{[^}]*\}/s,
	`datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`,
);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, pg, 'utf8');
// eslint-disable-next-line no-console
console.log('Wrote', path.relative(root, outPath));
