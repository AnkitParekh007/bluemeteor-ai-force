import { Injectable, Logger } from '@nestjs/common';

import { RagSearchService } from './rag-search.service';

@Injectable()
export class RagContextBuilderService {
	private readonly log = new Logger(RagContextBuilderService.name);

	constructor(private readonly search: RagSearchService) {}

	async buildContextForAgent(agentSlug: string, userMessage: string, budgetChars = 3500): Promise<string> {
		void agentSlug;
		try {
			const hits = await this.search.search(userMessage, 8);
			if (hits.length === 0) return '';
			let buf = '';
			for (const h of hits) {
				const block = `### ${h.documentTitle}\n${h.content}\n\n`;
				if (buf.length + block.length > budgetChars) break;
				buf += block;
			}
			return buf.trim();
		} catch (e) {
			this.log.warn(`RAG search skipped: ${e instanceof Error ? e.message : e}`);
			return '';
		}
	}

	async buildAugmentedSystemPrompt(basePrompt: string, ragContext: string): Promise<string> {
		if (!ragContext) return basePrompt;
		return `${basePrompt}\n\n## Relevant company knowledge\n${ragContext}`;
	}
}
