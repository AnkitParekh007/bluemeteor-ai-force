import { Injectable } from '@nestjs/common';

import { McpProcessManagerService } from './mcp-process-manager.service';

/**
 * Thin façade over {@link McpProcessManagerService} for MCP protocol calls (list/call).
 * Process lifecycle (start/stop) stays on the process manager.
 */
@Injectable()
export class McpClientService {
	constructor(private readonly process: McpProcessManagerService) {}

	listTools(serverId: string) {
		return this.process.listToolsFromSession(serverId);
	}

	callTool(serverId: string, toolName: string, input: Record<string, unknown>) {
		return this.process.callToolOnSession(serverId, toolName, input);
	}
}
