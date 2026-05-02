import { Injectable, OnModuleInit } from '@nestjs/common';

import type { ToolDefinition } from '../models/tool-definition.model';
import { TOOL_CATALOG } from '../tool-catalog';

@Injectable()
export class ToolRegistryService implements OnModuleInit {
	private readonly byId = new Map<string, ToolDefinition>();

	onModuleInit(): void {
		for (const t of TOOL_CATALOG) this.byId.set(t.id, t);
	}

	register(tool: ToolDefinition): void {
		this.byId.set(tool.id, tool);
	}

	listTools(): ToolDefinition[] {
		return [...this.byId.values()];
	}

	getTool(toolId: string): ToolDefinition | undefined {
		return this.byId.get(toolId);
	}

	listToolsForAgent(_agentSlug: string): ToolDefinition[] {
		return this.listTools();
	}
}
