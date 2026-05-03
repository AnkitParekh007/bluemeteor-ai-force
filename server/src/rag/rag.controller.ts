import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppConfigService } from '../config/app-config.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { SearchRagDto } from './dto/search-rag.dto';
import { RagDocumentRepository } from './repositories/rag-document.repository';
import { RagIngestionService } from './services/rag-ingestion.service';
import { RagSearchService } from './services/rag-search.service';
import { RagSeedService } from './services/rag-seed.service';

@Controller('rag')
export class RagController {
	constructor(
		private readonly ingestion: RagIngestionService,
		private readonly docs: RagDocumentRepository,
		private readonly searchService: RagSearchService,
		private readonly seed: RagSeedService,
		private readonly appConfig: AppConfigService,
	) {}

	@Post('documents')
	@RequirePermissions('data.rag.ingest')
	async ingestDocument(@Body() dto: IngestDocumentDto) {
		return this.ingestion.ingestDocument({
			title: dto.title,
			sourceType: dto.sourceType,
			sourceUri: dto.sourceUri,
			content: dto.content,
		});
	}

	@Get('documents')
	@RequirePermissions('data.rag.view')
	async listDocs() {
		return this.docs.findAll();
	}

	@Get('documents/:id')
	@RequirePermissions('data.rag.view')
	async getDoc(@Param('id') id: string) {
		const d = await this.docs.findById(id);
		if (!d) return null;
		return d;
	}

	@Post('search')
	@RequirePermissions('data.rag.view')
	async searchChunks(@Body() dto: SearchRagDto) {
		const limit = dto.limit ?? 5;
		return this.searchService.search(dto.query, limit);
	}

	@Post('seed-demo')
	@RequirePermissions('system.admin')
	async seedDemo() {
		if (!this.appConfig.isDevelopment) {
			throw new ForbiddenException('seed-demo is only available in development');
		}
		return this.seed.seedIfEmpty();
	}
}
