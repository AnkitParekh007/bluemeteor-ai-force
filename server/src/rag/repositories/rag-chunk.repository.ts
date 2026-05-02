import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { parseJson, stringifyJson } from '../../common/utils/json';
import type { RagChunk } from '../models/rag-chunk.model';

@Injectable()
export class RagChunkRepository {
	constructor(private readonly prisma: PrismaService) {}

	async createMany(
		chunks: Array<{
			id: string;
			documentId: string;
			content: string;
			chunkIndex: number;
			tokenCount?: number;
			metadata?: Record<string, unknown>;
		}>,
	): Promise<void> {
		const now = new Date();
		await this.prisma.ragChunk.createMany({
			data: chunks.map((c) => ({
				id: c.id,
				documentId: c.documentId,
				content: c.content,
				chunkIndex: c.chunkIndex,
				tokenCount: c.tokenCount ?? null,
				embeddingJson: null,
				metadataJson: stringifyJson(c.metadata),
				createdAt: now,
			})),
		});
	}

	async findAllForSearch(): Promise<(RagChunk & { documentTitle: string })[]> {
		const rows = await this.prisma.ragChunk.findMany({
			include: { document: true },
		});
		return rows.map((r) => ({
			id: r.id,
			documentId: r.documentId,
			content: r.content,
			chunkIndex: r.chunkIndex,
			tokenCount: r.tokenCount ?? undefined,
			metadata: parseJson<Record<string, unknown> | undefined>(r.metadataJson, undefined),
			createdAt: r.createdAt.toISOString(),
			documentTitle: r.document.title,
		}));
	}
}
