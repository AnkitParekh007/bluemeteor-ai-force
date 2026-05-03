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
	metadata?: Record<string, unknown>;
}
