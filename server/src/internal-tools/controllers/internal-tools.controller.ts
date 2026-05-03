import { Controller, Get, Query } from '@nestjs/common';

import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { AppConfigService } from '../../config/app-config.service';
import { InternalToolHubService } from '../services/internal-tool-hub.service';
import { McpAdapterService } from '../services/mcp-adapter.service';

@Controller('internal-tools')
export class InternalToolsController {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly hub: InternalToolHubService,
		private readonly mcp: McpAdapterService,
	) {}

	@Get('health')
	@RequirePermissions('tools.view')
	health() {
		return {
			enabled: this.cfg.enableInternalTools,
			repositoryReaderEnabled: this.cfg.enableRepositoryReader,
			docsReaderEnabled: this.cfg.enableDocsReader,
			ticketReaderEnabled: this.cfg.enableTicketReader,
			apiCatalogReaderEnabled: this.cfg.enableApiCatalogReader,
			databaseSchemaReaderEnabled: this.cfg.enableDatabaseSchemaReader,
			cicdReaderEnabled: this.cfg.enableCicdReader,
			mcpAdapterEnabled: this.cfg.enableMcpAdapter,
		};
	}

	@Get('repository/overview')
	@RequirePermissions('tools.view')
	repositoryOverview() {
		return this.hub.executeReadOnlyTool('repository_overview', {});
	}

	@Get('repository/files')
	@RequirePermissions('tools.view')
	repositoryFiles(@Query('q') q?: string) {
		return this.hub.executeReadOnlyTool('repository_list_files', { query: q ?? '' });
	}

	@Get('repository/search')
	@RequirePermissions('tools.view')
	repositorySearch(@Query('q') q: string, @Query('limit') limit?: string) {
		return this.hub.executeReadOnlyTool('repository_search_text', {
			query: q ?? '',
			limit: limit ? Number(limit) : 30,
		});
	}

	@Get('docs')
	@RequirePermissions('tools.view')
	docsList() {
		return this.hub.executeReadOnlyTool('docs_list', {});
	}

	@Get('docs/search')
	@RequirePermissions('tools.view')
	docsSearch(@Query('q') q: string, @Query('limit') limit?: string) {
		return this.hub.executeReadOnlyTool('docs_search', {
			query: q ?? '',
			limit: limit ? Number(limit) : 40,
		});
	}

	@Get('tickets')
	@RequirePermissions('tools.view')
	tickets() {
		return this.hub.executeReadOnlyTool('tickets_list', {});
	}

	@Get('tickets/search')
	@RequirePermissions('tools.view')
	ticketsSearch(@Query('q') q: string, @Query('limit') limit?: string) {
		return this.hub.executeReadOnlyTool('tickets_search', {
			query: q ?? '',
			limit: limit ? Number(limit) : 20,
		});
	}

	@Get('api-catalog')
	@RequirePermissions('tools.view')
	apiCatalog() {
		return this.hub.executeReadOnlyTool('api_catalog_list', {});
	}

	@Get('api-catalog/search')
	@RequirePermissions('tools.view')
	apiCatalogSearch(@Query('q') q: string, @Query('limit') limit?: string) {
		return this.hub.executeReadOnlyTool('api_catalog_search', {
			query: q ?? '',
			limit: limit ? Number(limit) : 25,
		});
	}

	@Get('database-schema')
	@RequirePermissions('tools.view')
	dbSchema() {
		return this.hub.executeReadOnlyTool('db_schema_overview', {});
	}

	@Get('database-schema/search')
	@RequirePermissions('tools.view')
	dbSchemaSearch(@Query('q') q: string, @Query('limit') limit?: string) {
		return this.hub.executeReadOnlyTool('db_schema_search', {
			query: q ?? '',
			limit: limit ? Number(limit) : 40,
		});
	}

	@Get('cicd/analyze')
	@RequirePermissions('tools.view')
	cicdAnalyze() {
		return this.hub.executeReadOnlyTool('cicd_analyze', {});
	}

	@Get('mcp/servers')
	@RequirePermissions('tools.view')
	async mcpServers() {
		return this.mcp.listConfiguredServers();
	}
}
