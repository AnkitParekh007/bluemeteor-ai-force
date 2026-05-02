import { Module } from '@nestjs/common';

import { RagChunkRepository } from './repositories/rag-chunk.repository';
import { RagDocumentRepository } from './repositories/rag-document.repository';
import { RagController } from './rag.controller';
import { RagChunkingService } from './services/rag-chunking.service';
import { RagContextBuilderService } from './services/rag-context-builder.service';
import { RagIngestionService } from './services/rag-ingestion.service';
import { RagSearchService } from './services/rag-search.service';
import { RagSeedService } from './services/rag-seed.service';

@Module({
	controllers: [RagController],
	providers: [
		RagDocumentRepository,
		RagChunkRepository,
		RagChunkingService,
		RagIngestionService,
		RagSearchService,
		RagContextBuilderService,
		RagSeedService,
	],
	exports: [RagContextBuilderService, RagSearchService, RagDocumentRepository],
})
export class RagModule {}
