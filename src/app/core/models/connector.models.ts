export type ConnectorStatus =
	| 'enabled'
	| 'disabled'
	| 'missing_config'
	| 'healthy'
	| 'unhealthy'
	| 'error';

export interface ConnectorDefinition {
	readonly id: string;
	readonly provider: string;
	readonly type: string;
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

export interface RepositorySummary {
	readonly id: string;
	readonly name: string;
	readonly slug: string;
	readonly fullName: string;
	readonly description?: string;
}

export interface RepositoryFileContent {
	readonly repoSlug: string;
	readonly path: string;
	readonly branch: string;
	readonly content: string;
	readonly language: string;
	readonly size: number;
}

export interface TicketSummary {
	readonly id: string;
	readonly key?: string;
	readonly title: string;
	readonly status?: string;
}

export interface TicketDetail extends TicketSummary {
	readonly description?: string;
}

export interface DocSummary {
	readonly id: string;
	readonly title: string;
	readonly spaceKey?: string;
	readonly excerpt?: string;
}

export interface DocContent extends DocSummary {
	readonly bodyText: string;
}

export interface CicdAnalysis {
	readonly summary: string;
	readonly filesConsidered: string[];
	readonly findings: string[];
	readonly riskHints: string[];
}
