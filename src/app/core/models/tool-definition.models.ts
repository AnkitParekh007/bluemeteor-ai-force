export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ToolCategory =
	| 'browser'
	| 'testing'
	| 'code'
	| 'docs'
	| 'data'
	| 'support'
	| 'devops'
	| 'system'
	| 'api'
	| 'product'
	| 'qa'
	| 'repository'
	| 'tickets'
	| 'integration'
	| 'connector';

export interface ToolDefinition {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly category: ToolCategory;
	readonly riskLevel: ToolRiskLevel;
	readonly enabled: boolean;
	readonly requiresApproval: boolean;
	readonly allowedInModes: Array<'ask' | 'plan' | 'act'>;
	readonly inputSchema?: Record<string, unknown>;
}
