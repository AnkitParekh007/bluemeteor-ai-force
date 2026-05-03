import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProvidersModule } from '../providers/providers.module';
import { InternalToolsController } from './controllers/internal-tools.controller';
import { McpController } from './controllers/mcp.controller';
import { McpServerRepository } from './repositories/mcp-server.repository';
import { McpToolRepository } from './repositories/mcp-tool.repository';
import { McpToolCallRepository } from './repositories/mcp-tool-call.repository';
import { ApiCatalogReaderService } from './services/api-catalog-reader.service';
import { CicdReaderService } from './services/cicd-reader.service';
import { DatabaseSchemaReaderService } from './services/database-schema-reader.service';
import { DocsReaderService } from './services/docs-reader.service';
import { InternalToolHubService } from './services/internal-tool-hub.service';
import { McpAdapterService } from './services/mcp-adapter.service';
import { McpClientService } from './services/mcp-client.service';
import { McpConfigLoaderService } from './services/mcp-config-loader.service';
import { McpProcessManagerService } from './services/mcp-process-manager.service';
import { RepositoryReaderService } from './services/repository-reader.service';
import { TicketReaderService } from './services/ticket-reader.service';

@Module({
	imports: [ProvidersModule, AuthModule],
	controllers: [InternalToolsController, McpController],
	providers: [
		RepositoryReaderService,
		DocsReaderService,
		TicketReaderService,
		ApiCatalogReaderService,
		DatabaseSchemaReaderService,
		CicdReaderService,
		McpConfigLoaderService,
		McpProcessManagerService,
		McpClientService,
		McpServerRepository,
		McpToolRepository,
		McpToolCallRepository,
		McpAdapterService,
		InternalToolHubService,
	],
	exports: [InternalToolHubService, McpAdapterService, CicdReaderService, TicketReaderService],
})
export class InternalToolsModule {}
