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

export type AgentStepStatus =
	| 'pending'
	| 'running'
	| 'completed'
	| 'failed'
	| 'skipped';

export type AgentRuntimeEventType =
	| 'session_created'
	| 'run_started'
	| 'step_started'
	| 'step_completed'
	| 'step_failed'
	| 'token'
	| 'message_created'
	| 'tool_call_started'
	| 'tool_call_completed'
	| 'tool_call_failed'
	| 'tool_blocked'
	| 'tool_execution_waiting_for_approval'
	| 'artifact_created'
	| 'approval_required'
	| 'approval_resolved'
	| 'browser_opened'
	| 'browser_navigated'
	| 'browser_screenshot_created'
	| 'browser_dom_inspected'
	| 'browser_action_completed'
	| 'browser_action_failed'
	| 'browser_profile_created'
	| 'browser_auth_capture_started'
	| 'browser_auth_waiting_for_login'
	| 'browser_auth_saved'
	| 'browser_profile_ready'
	| 'browser_authenticated_session_opened'
	| 'playwright_spec_generated'
	| 'playwright_spec_validated'
	| 'playwright_run_started'
	| 'playwright_test_case_completed'
	| 'playwright_run_completed'
	| 'playwright_run_failed'
	| 'test_run_started'
	| 'test_run_completed'
	| 'mcp_server_started'
	| 'mcp_server_stopped'
	| 'mcp_tools_discovered'
	| 'mcp_tool_called'
	| 'mcp_tool_blocked'
	| 'connector_call_started'
	| 'connector_call_completed'
	| 'connector_call_failed'
	| 'connector_fallback_used'
	| 'connector_disabled'
	| 'run_completed'
	| 'run_failed'
	| 'prompt_template_loaded'
	| 'prompt_template_rendered'
	| 'workflow_selected'
	| 'workflow_step_started'
	| 'workflow_step_completed'
	| 'evaluation_run_started'
	| 'evaluation_run_completed';

export type AgentToolCallStatus =
	| 'pending'
	| 'running'
	| 'completed'
	| 'failed'
	| 'blocked';

export type AgentApprovalRiskLevel =
	| 'low'
	| 'medium'
	| 'high'
	| 'critical';

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
	readonly riskLevel: AgentApprovalRiskLevel;
	readonly actionType: string;
	readonly payload: Record<string, unknown>;
	readonly status: 'pending' | 'approved' | 'rejected';
	readonly createdAt: string;
	readonly resolvedAt?: string;
}

export interface AgentRun {
	readonly id: string;
	readonly sessionId: string;
	readonly agentSlug: string;
	readonly mode: 'ask' | 'plan' | 'act';
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
	readonly traceId?: string;
}

export interface AgentRuntimeEvent {
	readonly id: string;
	readonly runId?: string;
	readonly sessionId: string;
	readonly agentSlug: string;
	readonly type: AgentRuntimeEventType;
	readonly title: string;
	readonly message?: string;
	readonly timestamp: string;
	readonly payload?: Record<string, unknown>;
}
