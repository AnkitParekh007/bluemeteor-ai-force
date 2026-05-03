export type AgentPromptTemplateType =
	| 'system'
	| 'developer'
	| 'tool_planning'
	| 'response_style'
	| 'evaluation'
	| 'artifact_generation';

export type AgentPromptTemplateStatus = 'draft' | 'active' | 'archived' | 'testing';

export interface AgentPromptVariable {
	readonly key: string;
	readonly description: string;
	readonly required: boolean;
	readonly defaultValue?: string;
}

export interface AgentPromptTemplate {
	readonly id: string;
	readonly agentSlug: string;
	readonly name: string;
	readonly description?: string;
	readonly version: string;
	readonly status: AgentPromptTemplateStatus;
	readonly type: AgentPromptTemplateType;
	readonly content: string;
	readonly variables: AgentPromptVariable[];
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly createdByUserId?: string;
	readonly metadata?: Record<string, unknown>;
}

export type AgentSkillPackStatus = 'draft' | 'active' | 'disabled' | 'archived';

export interface AgentSkillPack {
	readonly id: string;
	readonly agentSlug: string;
	readonly key: string;
	readonly name: string;
	readonly description?: string;
	readonly status: AgentSkillPackStatus;
	readonly toolIds: string[];
	readonly promptTemplateIds: string[];
	readonly workflowTemplateIds: string[];
	readonly knowledgeSources: string[];
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly metadata?: Record<string, unknown>;
}

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
	readonly id: string;
	readonly type: AgentWorkflowStepType;
	readonly title: string;
	readonly description?: string;
	readonly toolId?: string;
	readonly inputTemplate?: Record<string, unknown>;
	readonly requiresApproval?: boolean;
	readonly outputKey?: string;
	readonly condition?: string;
}

export interface AgentWorkflowTemplate {
	readonly id: string;
	readonly agentSlug: string;
	readonly key: string;
	readonly name: string;
	readonly description?: string;
	readonly category: string;
	readonly mode: 'ask' | 'plan' | 'act';
	readonly steps: AgentWorkflowStep[];
	readonly requiredTools: string[];
	readonly outputArtifactTypes: string[];
	readonly status: 'draft' | 'active' | 'disabled';
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly metadata?: Record<string, unknown>;
}

export interface AgentEvaluationCase {
	readonly id: string;
	readonly agentSlug: string;
	readonly key: string;
	readonly name: string;
	readonly description?: string;
	readonly inputPrompt: string;
	readonly expectedBehaviors: string[];
	readonly expectedArtifacts: string[];
	readonly expectedTools: string[];
	readonly category: string;
	readonly priority: 'low' | 'medium' | 'high' | 'critical';
	readonly status: 'active' | 'disabled';
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly metadata?: Record<string, unknown>;
}

export interface AgentEvaluationCaseResult {
	readonly id: string;
	readonly evaluationRunId: string;
	readonly evaluationCaseId: string;
	readonly status: 'passed' | 'failed' | 'partial';
	readonly score: number;
	readonly inputPrompt: string;
	readonly actualAnswer?: string;
	readonly expectedSummary?: string;
	readonly toolResults?: unknown[];
	readonly artifactResults?: unknown[];
	readonly issues: string[];
	readonly createdAt: string;
}

export interface AgentEvaluationRun {
	readonly id: string;
	readonly agentSlug: string;
	readonly promptTemplateId?: string;
	readonly skillPackId?: string;
	readonly status: 'queued' | 'running' | 'completed' | 'failed';
	readonly totalCases: number;
	readonly passedCases: number;
	readonly failedCases: number;
	readonly score: number;
	readonly startedAt: string;
	readonly completedAt?: string;
	readonly results: AgentEvaluationCaseResult[];
	readonly error?: string;
	readonly metadata?: Record<string, unknown>;
}

export interface AgentIntelligenceReadinessRow {
	readonly agentSlug: string;
	readonly prompts: number;
	readonly skillPacks: number;
	readonly workflows: number;
	readonly evalCases: number;
	readonly latestEvaluation: { readonly score: number; readonly runId: string; readonly at: string } | null;
}
