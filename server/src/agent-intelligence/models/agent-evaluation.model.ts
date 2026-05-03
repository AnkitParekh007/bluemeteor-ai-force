export interface AgentEvaluationCase {
	id: string;
	agentSlug: string;
	key: string;
	name: string;
	description?: string;
	inputPrompt: string;
	expectedBehaviors: string[];
	expectedArtifacts: string[];
	expectedTools: string[];
	category: string;
	priority: 'low' | 'medium' | 'high' | 'critical';
	status: 'active' | 'disabled';
	createdAt: string;
	updatedAt: string;
	metadata?: Record<string, unknown>;
}

export interface AgentEvaluationCaseResult {
	id: string;
	evaluationRunId: string;
	evaluationCaseId: string;
	status: 'passed' | 'failed' | 'partial';
	score: number;
	inputPrompt: string;
	actualAnswer?: string;
	expectedSummary?: string;
	toolResults?: unknown[];
	artifactResults?: unknown[];
	issues: string[];
	createdAt: string;
}

export interface AgentEvaluationRun {
	id: string;
	agentSlug: string;
	promptTemplateId?: string;
	skillPackId?: string;
	status: 'queued' | 'running' | 'completed' | 'failed';
	totalCases: number;
	passedCases: number;
	failedCases: number;
	score: number;
	startedAt: string;
	completedAt?: string;
	results: AgentEvaluationCaseResult[];
	error?: string;
	metadata?: Record<string, unknown>;
}

export interface RunEvaluationOptions {
	readonly promptTemplateId?: string;
	readonly skillPackId?: string;
	readonly useRealProvider?: boolean;
	readonly allowBrowserAndTestTools?: boolean;
	readonly caseIds?: string[];
	readonly maxCases?: number;
}
