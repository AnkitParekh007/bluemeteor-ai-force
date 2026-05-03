export type ImprovementCategory =
	| 'prompt'
	| 'workflow'
	| 'skill_pack'
	| 'tool_planning'
	| 'rag_context'
	| 'connector_context'
	| 'artifact_quality'
	| 'evaluation_case'
	| 'ui'
	| 'performance'
	| 'safety';

export type ImprovementPriority = 'critical' | 'high' | 'medium' | 'low';

export type ImprovementStatus =
	| 'new'
	| 'accepted'
	| 'rejected'
	| 'in_progress'
	| 'implemented'
	| 'validated'
	| 'closed';

export interface AgentImprovementBacklogItem {
	id: string;
	agentSlug: string;
	title: string;
	description: string;
	sourceType: 'feedback' | 'failed_run' | 'evaluation' | 'admin' | 'audit';
	sourceId?: string;
	priority: ImprovementPriority;
	status: ImprovementStatus;
	category: ImprovementCategory;
	proposedChange?: {
		promptTemplatePatch?: string;
		workflowSuggestion?: unknown;
		skillPackSuggestion?: unknown;
		newEvaluationCase?: unknown;
		notes?: string;
	};
	expectedImpact?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
	metadata?: Record<string, unknown>;
}
