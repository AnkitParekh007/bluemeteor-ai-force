import type { ToolRiskLevel } from './tool-definition.model';

export type ToolExecutionStatus =
	| 'queued'
	| 'requires_approval'
	| 'running'
	| 'completed'
	| 'failed'
	| 'blocked'
	| 'cancelled';

export interface ToolExecutionRequest {
	readonly runId: string;
	readonly sessionId: string;
	readonly agentSlug: string;
	readonly mode: 'ask' | 'plan' | 'act';
	readonly toolId: string;
	readonly input: Record<string, unknown>;
	readonly requestedBy?: string;
	/** When set, RBAC is enforced via permission checks on the loaded user. */
	readonly actorUserId?: string;
	/** When set, browser tool execution targets this Playwright browser session instead of getOrCreateActiveSession. */
	readonly targetBrowserSessionId?: string;
}

export interface ToolExecutionResult {
	readonly executionId: string;
	readonly status: ToolExecutionStatus;
	readonly output?: Record<string, unknown>;
	readonly artifactIds?: string[];
	readonly eventIds?: string[];
	readonly error?: string;
	readonly approvalId?: string;
}

export interface ToolExecutionRecord {
	readonly id: string;
	readonly runId: string;
	readonly sessionId: string;
	readonly agentSlug: string;
	readonly toolId: string;
	readonly status: ToolExecutionStatus;
	readonly riskLevel: ToolRiskLevel;
	readonly input?: Record<string, unknown>;
	readonly output?: Record<string, unknown>;
	readonly error?: string;
	readonly approvalId?: string;
	readonly createdAt: string;
	readonly startedAt?: string;
	readonly completedAt?: string;
}
