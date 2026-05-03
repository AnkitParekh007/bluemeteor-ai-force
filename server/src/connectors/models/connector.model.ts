export type ConnectorType =
	| 'repository'
	| 'tickets'
	| 'docs'
	| 'support'
	| 'cicd'
	| 'api'
	| 'database';

export type ConnectorProvider =
	| 'bitbucket'
	| 'github'
	| 'jira'
	| 'confluence'
	| 'zendesk'
	| 'servicenow'
	| 'local'
	| 'mock';

export type ConnectorStatus =
	| 'enabled'
	| 'disabled'
	| 'missing_config'
	| 'healthy'
	| 'unhealthy'
	| 'error';

export interface ConnectorDefinition {
	readonly id: string;
	readonly provider: ConnectorProvider;
	readonly type: ConnectorType;
	readonly name: string;
	readonly description: string;
	readonly enabled: boolean;
	readonly readOnly: boolean;
	readonly status: ConnectorStatus;
	readonly capabilities: string[];
}

export interface ConnectorHealth {
	readonly connectorId: string;
	readonly status: ConnectorStatus;
	readonly message: string;
	readonly checkedAt: string;
	readonly metadata?: Record<string, unknown>;
}

export interface ConnectorCallRecord {
	readonly id: string;
	readonly connectorId: string;
	readonly operation: string;
	readonly input: Record<string, unknown>;
	readonly outputSummary?: string;
	readonly status: 'success' | 'failed' | 'blocked';
	readonly error?: string;
	readonly createdAt: string;
	readonly completedAt?: string;
}
