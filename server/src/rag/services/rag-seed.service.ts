import { Injectable } from '@nestjs/common';

import { RagDocumentRepository } from '../repositories/rag-document.repository';
import { RagIngestionService } from './rag-ingestion.service';

const DEMO_DOCS: Array<{ title: string; content: string }> = [
	{
		title: 'Supplier Portal Overview',
		content:
			'The Supplier Portal lets vendors upload product catalogs (CSV), manage SKU status, and track syndication.\n\nKey paths: /uploads for CSV ingest, /dashboard for KPIs.',
	},
	{
		title: 'Product Upload Workflow',
		content:
			'Upload CSV → validate columns → map to internal schema → preview → confirm. Failures surface inline with row-level errors and correlation IDs.',
	},
	{
		title: 'Key Statistics Dashboard',
		content:
			'Dashboard tiles: active SKUs, failed uploads (24h), syndication lag, top suppliers by volume. Drill-through opens filtered grids.',
	},
	{
		title: 'Syndication Workflow',
		content:
			'Approved SKUs flow to channel connectors on a schedule. Retries are exponential; poison messages go to a DLQ queue for ops review.',
	},
	{
		title: 'SKU Status Business Process',
		content:
			'Draft → Review → Approved → Published → Deprecated. Only Approved SKUs are syndicated. Bulk transitions require elevated role.',
	},
	{
		title: 'Internal Agent Workspace Guide',
		content:
			'Agents run in Ask/Plan/Act modes. Sessions persist to the orchestrator database. Approvals gate risky tools. Browser and tests are mocked until workers land.',
	},
];

@Injectable()
export class RagSeedService {
	constructor(
		private readonly docs: RagDocumentRepository,
		private readonly ingest: RagIngestionService,
	) {}

	async seedIfEmpty(): Promise<{ seeded: number }> {
		const n = await this.docs.count();
		if (n > 0) return { seeded: 0 };
		let seeded = 0;
		for (const d of DEMO_DOCS) {
			await this.ingest.ingestDocument({
				title: d.title,
				sourceType: 'manual',
				content: d.content,
			});
			seeded++;
		}
		return { seeded };
	}
}
