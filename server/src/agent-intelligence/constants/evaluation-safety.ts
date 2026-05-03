/**
 * Tools blocked during evaluation runs unless allowBrowserAndTestTools is true.
 * Does not bypass ToolPermissionService — this is an extra safety layer.
 */
export const EVALUATION_TOOL_BLOCKLIST = new Set<string>([
	'playwright_run_template',
	'playwright_run_validated_spec',
	'playwright_validate_spec',
	'browser_auth_capture_start',
	'browser_create_demo_auth_profile',
	'browser_open_authenticated',
	'test_run_browser_flow',
	'database_execute',
	'deploy',
	'mcp_call_tool',
]);

export const MAX_EVAL_CASES_PER_RUN = 30;
export const MAX_WORKFLOW_STEPS = 20;
export const MAX_PROMPT_TEMPLATE_CHARS = 200_000;
