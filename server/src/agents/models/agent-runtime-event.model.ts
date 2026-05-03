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
