export type FeedbackTriageCategory =
	| 'wrong_answer'
	| 'incomplete_answer'
	| 'bad_format'
	| 'missing_artifact'
	| 'wrong_tool_used'
	| 'tool_failed'
	| 'browser_failed'
	| 'slow_response'
	| 'permission_issue'
	| 'hallucination'
	| 'poor_prompt_understanding'
	| 'missing_context'
	| 'ui_issue'
	| 'other';

export type FeedbackSeverity = 'critical' | 'high' | 'medium' | 'low';

export type FeedbackTriageStatus =
	| 'new'
	| 'triaged'
	| 'planned'
	| 'in_progress'
	| 'resolved'
	| 'wont_fix';

export interface PilotFeedbackTriage {
	id: string;
	feedbackId: string;
	agentSlug: string;
	category: FeedbackTriageCategory;
	severity: FeedbackSeverity;
	status: FeedbackTriageStatus;
	summary: string;
	rootCause?: string;
	recommendedAction?: string;
	assignedToUserId?: string;
	createdAt: string;
	updatedAt: string;
	resolvedAt?: string;
}

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
	proposedChangeJson?: string;
	expectedImpact?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
}

export interface AgentImprovementRun {
	id: string;
	agentSlug: string;
	title: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	baselineScore?: number;
	newScore?: number;
	evaluationRunId?: string;
	createdAt: string;
	completedAt?: string;
}

export interface TriageStats {
	byStatus: { status: string; _count: { _all: number } }[];
	bySeverity: { severity: string; _count: { _all: number } }[];
	byCategory: { category: string; _count: { _all: number } }[];
}

export interface BacklogStats {
	byStatus: { status: string; _count: { _all: number } }[];
	byCategory: { category: string; _count: { _all: number } }[];
	openHighPriorityCount: number;
}

export interface AgentQualitySnapshot {
	agentSlug: string;
	latestScore: number | null;
	previousScore: number | null;
	scoreDelta: number | null;
	latestRunId: string | null;
	previousRunId: string | null;
	latestRunAt: string | null;
	totalCases: number;
	passedCases: number;
	failedCases: number;
}

export interface RegressionSummary {
	agentSlug: string;
	message?: string;
	snapshot: AgentQualitySnapshot;
	comparison?: {
		scoreDelta: number;
		improved: boolean;
		regressed: boolean;
		improvedCaseIds: string[];
		regressedCaseIds: string[];
		unresolvedIssueCount: number;
		recommendation: string;
	};
}

export interface ImprovementReport {
	markdown: string;
	data: {
		generatedAt: string;
		feedbackCount: number;
		averageRating: number | null;
		triagedCount: number;
		openHighSeverityCount: number;
		backlogCount: number;
		implementedCount: number;
		validatedCount: number;
		topCategories: string[];
		backlogByStatus: { status: string; _count: { _all: number } }[];
	};
}
