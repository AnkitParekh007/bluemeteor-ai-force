import { Controller, Get, Param, Post, Query } from '@nestjs/common';

import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { ConnectorHealthService } from '../services/connector-health.service';
import { ConnectorHubService } from '../services/connector-hub.service';
import { ConnectorRegistryService } from '../services/connector-registry.service';

/** Debug/admin read-only routes — register static paths before `:connectorId` patterns. */
@Controller('connectors')
export class ConnectorsController {
	constructor(
		private readonly registry: ConnectorRegistryService,
		private readonly health: ConnectorHealthService,
		private readonly hub: ConnectorHubService,
	) {}

	@Get()
	@RequirePermissions('tools.view')
	listConnectors() {
		return this.registry.listConnectors();
	}

	@Get('health')
	@RequirePermissions('tools.view')
	async allHealth() {
		return this.health.getAllHealth();
	}

	@Get('repository/repos')
	@RequirePermissions('tools.view')
	repositoryRepos() {
		return this.hub.executeConnectorTool('connector_repo_list', {});
	}

	@Get('repository/search')
	@RequirePermissions('tools.view')
	repositorySearch(@Query('q') q?: string, @Query('repoSlug') repoSlug?: string) {
		return this.hub.executeConnectorTool('connector_repo_search', { query: q ?? '', repoSlug: repoSlug ?? '' });
	}

	@Get('repository/file')
	@RequirePermissions('tools.view')
	repositoryFile(@Query('repoSlug') repoSlug: string, @Query('path') path: string, @Query('branch') branch?: string) {
		return this.hub.executeConnectorTool('connector_repo_read_file', {
			repoSlug: repoSlug ?? '',
			path: path ?? '',
			branch: branch ?? 'main',
		});
	}

	@Get('tickets/search')
	@RequirePermissions('tools.view')
	ticketSearch(@Query('q') q?: string) {
		return this.hub.executeConnectorTool('connector_jira_search', { query: q ?? '' });
	}

	@Get('tickets/:ticketId')
	@RequirePermissions('tools.view')
	ticketGet(@Param('ticketId') ticketId: string) {
		return this.hub.executeConnectorTool('connector_jira_get_issue', { issueKey: ticketId });
	}

	@Get('docs/search')
	@RequirePermissions('tools.view')
	docsSearch(@Query('q') q?: string) {
		return this.hub.executeConnectorTool('connector_confluence_search', { query: q ?? '' });
	}

	@Get('docs/:pageId')
	@RequirePermissions('tools.view')
	docsGet(@Param('pageId') pageId: string) {
		return this.hub.executeConnectorTool('connector_confluence_get_page', { pageId });
	}

	@Get('cicd/analyze')
	@RequirePermissions('tools.view')
	cicdAnalyze() {
		return this.hub.executeConnectorTool('connector_cicd_analyze', {});
	}

	@Get(':connectorId/health')
	@RequirePermissions('tools.view')
	async oneHealth(@Param('connectorId') connectorId: string) {
		return this.health.getHealth(connectorId);
	}

	@Post(':connectorId/health/refresh')
	@RequirePermissions('tools.view')
	async refresh(@Param('connectorId') connectorId: string) {
		return this.health.refreshHealth(connectorId);
	}
}
