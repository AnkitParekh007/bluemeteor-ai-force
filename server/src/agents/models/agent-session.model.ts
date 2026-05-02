export type AgentSessionStatus =
	| 'active'
	| 'idle'
	| 'running'
	| 'completed'
	| 'failed'
	| 'archived';

export type AgentWorkspaceMode = 'ask' | 'plan' | 'act';

export interface AgentSession {
	readonly id: string;
	readonly agentSlug: string;
	readonly title: string;
	readonly mode: AgentWorkspaceMode;
	readonly status: AgentSessionStatus;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly messageCount: number;
	readonly preview?: string;
}
