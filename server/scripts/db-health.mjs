/**
 * DB connectivity check for CI / Docker health scripts. Does not start Nest.
 * Usage (from server/): node scripts/db-health.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
	await prisma.$queryRaw`SELECT 1`;
	const runs = await prisma.agentRun.count();
	// eslint-disable-next-line no-console
	console.log(JSON.stringify({ ok: true, agentRunCount: runs }, null, 2));
} catch (e) {
	// eslint-disable-next-line no-console
	console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }, null, 2));
	process.exit(1);
} finally {
	await prisma.$disconnect();
}
