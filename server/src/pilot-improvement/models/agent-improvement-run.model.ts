export interface AgentImprovementRun {
	id: string;
	agentSlug: string;
	title: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	baselineScore?: number;
	newScore?: number;
	changesApplied?: Record<string, unknown>;
	evaluationRunId?: string;
	createdAt: string;
	completedAt?: string;
	metadata?: Record<string, unknown>;
}
