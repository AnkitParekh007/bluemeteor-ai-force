import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { AppConfigService } from '../../config/app-config.service';
import { McpAdapterService } from '../services/mcp-adapter.service';
import { McpConfigLoaderService } from '../services/mcp-config-loader.service';

@Controller('mcp')
export class McpController {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly mcp: McpAdapterService,
		private readonly loader: McpConfigLoaderService,
	) {}

	@Get('health')
	@RequirePermissions('tools.view')
	async health() {
		const snap = await this.mcp.getHealthSnapshot();
		return {
			enabled: this.cfg.enableMcpAdapter,
			configuredServers: snap.configuredServers,
			runningServers: snap.runningServers,
			allowStdio: this.cfg.mcpAllowStdio,
			allowHttp: this.cfg.mcpAllowHttp,
			allowSse: this.cfg.mcpAllowSse,
			allowWriteTools: this.cfg.mcpAllowWriteTools,
		};
	}

	@Get('servers')
	@RequirePermissions('tools.view')
	async servers() {
		const list = await this.mcp.listConfiguredServers();
		const safe = await this.loader.getSafePublicConfig();
		return { runtimes: list, publicConfig: safe };
	}

	@Post('servers/:serverId/start')
	@RequirePermissions('tools.manage')
	async start(@Param('serverId') serverId: string) {
		return this.mcp.startServer(serverId);
	}

	@Post('servers/:serverId/stop')
	@RequirePermissions('tools.manage')
	async stop(@Param('serverId') serverId: string) {
		await this.mcp.stopServer(serverId);
		return { ok: true };
	}

	@Post('servers/:serverId/discover')
	@RequirePermissions('tools.view')
	async discover(@Param('serverId') serverId: string) {
		return this.mcp.discoverTools(serverId);
	}

	@Get('tools')
	@RequirePermissions('tools.view')
	async toolsList() {
		return this.mcp.listTools();
	}

	@Post('tools/call')
	@RequirePermissions('tools.execute.medium')
	async call(
		@Body()
		body: {
			serverId: string;
			toolName: string;
			input?: Record<string, unknown>;
		},
	) {
		return this.mcp.callTool({
			serverId: body.serverId,
			toolName: body.toolName,
			input: body.input ?? {},
		});
	}
}
