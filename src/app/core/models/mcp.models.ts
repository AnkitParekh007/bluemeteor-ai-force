export type McpTransport = 'stdio' | 'http' | 'sse';

export type McpServerStatus =
	| 'disabled'
	| 'configured'
	| 'starting'
	| 'running'
	| 'failed'
	| 'stopped';

export type McpToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface McpServerConfigSummary {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly enabled: boolean;
	readonly transport: McpTransport;
	readonly riskLevel: McpToolRiskLevel;
	readonly readOnly: boolean;
	readonly hasEnvironment: boolean;
	readonly commandSummary?: string;
	readonly argsCount: number;
	readonly urlHost?: string;
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

export interface McpToolCallResult {
	readonly serverId: string;
	readonly toolName: string;
	readonly content: string;
	readonly structuredContent?: Record<string, unknown>;
	readonly isError: boolean;
	readonly metadata?: Record<string, unknown>;
}

export interface McpHealthResponse {
	readonly enabled: boolean;
	readonly configuredServers: number;
	readonly runningServers: number;
	readonly allowStdio: boolean;
	readonly allowHttp: boolean;
	readonly allowSse?: boolean;
	readonly allowWriteTools: boolean;
}
