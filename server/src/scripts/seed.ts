import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { RagSeedService } from '../rag/services/rag-seed.service';

/**
 * Idempotent seed helper: boots Nest (runs auth + agent-intelligence OnModuleInit seeds)
 * and fills RAG demo docs when empty.
 */
async function main(): Promise<void> {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ['error', 'warn', 'log'],
	});
	try {
		const rag = app.get(RagSeedService);
		const r = await rag.seedIfEmpty();
		// eslint-disable-next-line no-console
		console.log(JSON.stringify({ ragSeeded: r.seeded }, null, 2));
	} finally {
		await app.close();
	}
}

void main().catch((e) => {
	// eslint-disable-next-line no-console
	console.error(e);
	process.exit(1);
});
