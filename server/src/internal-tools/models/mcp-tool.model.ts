export type McpTransport = 'stdio' | 'http' | 'sse';

export type McpServerStatus =
	| 'disabled'
	| 'configured'
	| 'starting'
	| 'running'
	| 'failed'
	| 'stopped';

export type McpToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface McpServerConfig {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly enabled: boolean;
	readonly transport: McpTransport;
	readonly command?: string;
	readonly args?: string[];
	readonly url?: string;
	readonly workingDirectory?: string;
	readonly environment?: Record<string, string>;
	readonly riskLevel: McpToolRiskLevel;
	readonly allowedTools?: string[];
	readonly deniedTools?: string[];
	readonly readOnly: boolean;
	/** In-process demo MCP (no stdio spawn). */
	readonly mockOnly?: boolean;
}

export interface McpServerRuntime {
	readonly id: string;
	readonly name: string;
	readonly status: McpServerStatus;
	readonly transport: McpTransport;
	readonly startedAt?: string;
	readonly stoppedAt?: string;
	readonly error?: string;
	readonly toolCount: number;
	readonly readOnly: boolean;
	readonly riskLevel: McpToolRiskLevel;
}

export interface McpToolDefinition {
	readonly serverId: string;
	readonly name: string;
	readonly description?: string;
	readonly inputSchema?: Record<string, unknown>;
	readonly riskLevel: McpToolRiskLevel;
	readonly readOnly: boolean;
	readonly enabled: boolean;
}

export interface McpToolCallRequest {
	readonly serverId: string;
	readonly toolName: string;
	readonly input: Record<string, unknown>;
	readonly runId?: string;
	readonly sessionId?: string;
	readonly agentSlug?: string;
}

export interface McpToolCallResult {
	readonly serverId: string;
	readonly toolName: string;
	readonly content: string;
	readonly structuredContent?: Record<string, unknown>;
	readonly isError: boolean;
	readonly metadata?: Record<string, unknown>;
}

/** Legacy alias used in early hub code — prefer McpToolDefinition. */
export type McpToolDescriptor = Pick<McpToolDefinition, 'name' | 'description'>;
