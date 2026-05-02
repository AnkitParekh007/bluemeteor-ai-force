import { Injectable } from '@nestjs/common';

import { RagChunkRepository } from '../repositories/rag-chunk.repository';
import type { RagSearchResult } from '../models/rag-search-result.model';

@Injectable()
export class RagSearchService {
	constructor(private readonly chunks: RagChunkRepository) {}

	async search(query: string, limit: number = 5): Promise<RagSearchResult[]> {
		const q = query.toLowerCase();
		const terms = q.split(/\s+/).filter((t) => t.length > 1);
		if (terms.length === 0) return [];
		const all = await this.chunks.findAllForSearch();
		const scored: RagSearchResult[] = all.map((c) => {
			const text = `${c.content} ${c.documentTitle}`.toLowerCase();
			let score = 0;
			for (const t of terms) {
				if (text.includes(t)) score += 1 + t.length * 0.01;
			}
			return {
				chunkId: c.id,
				documentId: c.documentId,
				documentTitle: c.documentTitle,
				content: c.content,
				score,
			};
		});
		return scored
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);
	}
}
