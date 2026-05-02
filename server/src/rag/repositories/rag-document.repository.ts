import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { parseJson, stringifyJson } from '../../common/utils/json';
import type { RagDocument } from '../models/rag-document.model';

@Injectable()
export class RagDocumentRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(params: {
		id: string;
		title: string;
		sourceType: string;
		sourceUri?: string | null;
		content: string;
		metadata?: Record<string, unknown>;
	}): Promise<RagDocument> {
		const now = new Date();
		const row = await this.prisma.ragDocument.create({
			data: {
				id: params.id,
				title: params.title,
				sourceType: params.sourceType,
				sourceUri: params.sourceUri ?? null,
				content: params.content,
				metadataJson: stringifyJson(params.metadata),
				createdAt: now,
				updatedAt: now,
			},
		});
		return this.map(row);
	}

	async findAll(): Promise<RagDocument[]> {
		const rows = await this.prisma.ragDocument.findMany({ orderBy: { createdAt: 'desc' } });
		return rows.map((r) => this.map(r));
	}

	async findById(id: string): Promise<RagDocument | null> {
		const row = await this.prisma.ragDocument.findUnique({ where: { id } });
		return row ? this.map(row) : null;
	}

	async count(): Promise<number> {
		return this.prisma.ragDocument.count();
	}

	private map(row: {
		id: string;
		title: string;
		sourceType: string;
		sourceUri: string | null;
		content: string;
		metadataJson: string | null;
		createdAt: Date;
		updatedAt: Date;
	}): RagDocument {
		return {
			id: row.id,
			title: row.title,
			sourceType: row.sourceType,
			sourceUri: row.sourceUri ?? undefined,
			content: row.content,
			metadata: parseJson<Record<string, unknown> | undefined>(row.metadataJson, undefined),
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}
