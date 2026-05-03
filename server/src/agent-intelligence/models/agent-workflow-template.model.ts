export type AgentWorkflowStepType =
	| 'ask_clarification'
	| 'search_context'
	| 'run_tool'
	| 'generate_artifact'
	| 'browser_action'
	| 'test_action'
	| 'approval_gate'
	| 'provider_response'
	| 'final_summary';

export interface AgentWorkflowStep {
	id: string;
	type: AgentWorkflowStepType;
	title: string;
	description?: string;
	toolId?: string;
	inputTemplate?: Record<string, unknown>;
	requiresApproval?: boolean;
	outputKey?: string;
	condition?: string;
}

export interface AgentWorkflowTemplate {
	id: string;
	agentSlug: string;
	key: string;
	name: string;
	description?: string;
	category: string;
	mode: 'ask' | 'plan' | 'act';
	steps: AgentWorkflowStep[];
	requiredTools: string[];
	outputArtifactTypes: string[];
	status: 'draft' | 'active' | 'disabled';
	createdAt: string;
	updatedAt: string;
	metadata?: Record<string, unknown>;
}
