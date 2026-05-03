import { Injectable } from '@nestjs/common';

import { newId } from '../../common/utils/ids';
import { RagChunkRepository } from '../repositories/rag-chunk.repository';
import { RagDocumentRepository } from '../repositories/rag-document.repository';
import { RagChunkingService } from './rag-chunking.service';

@Injectable()
export class RagIngestionService {
	constructor(
		private readonly docs: RagDocumentRepository,
		private readonly chunks: RagChunkRepository,
		private readonly chunking: RagChunkingService,
	) {}

	async ingestDocument(params: {
		title: string;
		sourceType: string;
		sourceUri?: string;
		content: string;
	}): Promise<{ documentId: string; chunkCount: number }> {
		const docId = newId('ragdoc');
		await this.docs.create({
			id: docId,
			title: params.title,
			sourceType: params.sourceType,
			sourceUri: params.sourceUri ?? null,
			content: params.content,
		});
		const parts = this.chunking.chunkText(params.content);
		let i = 0;
		const chunkRows = parts.map((content) => ({
			id: newId('ragchk'),
			documentId: docId,
			content,
			chunkIndex: i++,
			tokenCount: Math.ceil(content.length / 4),
		}));
		if (chunkRows.length > 0) await this.chunks.createMany(chunkRows);
		return { documentId: docId, chunkCount: chunkRows.length };
	}
}
