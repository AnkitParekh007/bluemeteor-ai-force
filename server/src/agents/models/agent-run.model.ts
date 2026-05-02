import type { AgentWorkspaceMode } from './agent-session.model';

export type AgentRunStatus =
	| 'queued'
	| 'starting'
	| 'thinking'
	| 'planning'
	| 'executing'
	| 'waiting_for_approval'
	| 'completed'
	| 'failed'
	| 'cancelled';

export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type AgentToolCallStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export interface AgentRunStep {
	readonly id: string;
	readonly runId: string;
	readonly title: string;
	readonly description?: string;
	readonly status: AgentStepStatus;
	readonly startedAt?: string;
	readonly completedAt?: string;
	readonly error?: string;
	readonly metadata?: Record<string, unknown>;
}

export interface AgentToolCall {
	readonly id: string;
	readonly runId: string;
	readonly name: string;
	readonly description?: string;
	readonly status: AgentToolCallStatus;
	readonly input?: Record<string, unknown>;
	readonly output?: Record<string, unknown>;
	readonly error?: string;
	readonly startedAt?: string;
	readonly completedAt?: string;
}

export interface AgentApprovalRequest {
	readonly id: string;
	readonly runId: string;
	readonly title: string;
	readonly description: string;
	readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
	readonly actionType: string;
	readonly payload: Record<string, unknown>;
	readonly status: 'pending' | 'approved' | 'rejected';
	readonly createdAt: string;
	readonly resolvedAt?: string;
	readonly requestedByUserId?: string;
	readonly resolvedByUserId?: string;
	readonly resolvedByEmail?: string;
}

export interface AgentRun {
	readonly id: string;
	readonly sessionId: string;
	readonly agentSlug: string;
	readonly mode: AgentWorkspaceMode;
	readonly status: AgentRunStatus;
	readonly userMessage: string;
	readonly finalAnswer?: string;
	readonly steps: AgentRunStep[];
	readonly toolCalls: AgentToolCall[];
	readonly approvals: AgentApprovalRequest[];
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly completedAt?: string;
	readonly error?: string;
	readonly actorUserId?: string;
	readonly actorEmail?: string;
}
