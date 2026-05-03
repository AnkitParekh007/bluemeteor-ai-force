export type PilotRole =
	| 'frontend_engineer'
	| 'backend_engineer'
	| 'qa_engineer'
	| 'product_manager'
	| 'documentation_owner'
	| 'data_analyst'
	| 'support_agent'
	| 'devops_engineer'
	| 'team_lead'
	| 'admin';

export interface PilotAgentGuide {
	readonly agentSlug: string;
	readonly agentName: string;
	readonly role: PilotRole;
	readonly description: string;
	readonly bestFor: string[];
	readonly samplePrompts: string[];
	readonly do: string[];
	readonly dont: string[];
	readonly expectedOutputs: string[];
	readonly escalationNotes?: string[];
}

export interface PilotDemoScript {
	readonly id: string;
	readonly title: string;
	readonly agentSlug: string;
	readonly role: PilotRole;
	readonly durationMinutes: number;
	readonly objective: string;
	readonly setup: string[];
	readonly prompts: string[];
	readonly expectedResults: string[];
	readonly successCriteria: string[];
}

export interface PilotFeedbackPayload {
	readonly userRole: PilotRole;
	readonly agentSlug: string;
	readonly rating: number;
	readonly taskType: string;
	readonly whatWorked: string;
	readonly whatFailed: string;
	readonly timeSavedMinutes?: number;
	readonly wouldUseAgain: boolean;
	readonly notes?: string;
	readonly sessionId?: string;
	readonly runId?: string;
	readonly traceId?: string;
}

export interface PilotFeedback extends PilotFeedbackPayload {
	readonly id: string;
	readonly userId?: string | null;
	readonly userEmail?: string | null;
	readonly createdAt: string;
}

export interface PilotReadinessCheck {
	readonly id: string;
	readonly category: string;
	readonly title: string;
	readonly description: string;
	readonly status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'warning';
	readonly severity: 'critical' | 'high' | 'medium' | 'low';
	readonly owner?: string;
	readonly recommendation?: string;
}

export interface PilotSuccessMetric {
	readonly id: string;
	readonly label: string;
	readonly value: string | number;
	readonly target?: string | number;
	readonly status: 'good' | 'warning' | 'bad' | 'unknown';
	readonly description?: string;
}
