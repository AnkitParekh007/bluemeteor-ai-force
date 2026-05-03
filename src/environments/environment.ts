export const environment = {
	production: false,
	/** Shown in Admin Console header (no secrets). */
	deployEnv: 'local' as 'local' | 'docker' | 'production',
	agentApiBaseUrl: 'http://localhost:3000',
	/**
	 * Live Nest orchestrator on `agentApiBaseUrl`. Set to `true` if the server is not running
	 * so the UI keeps working against MockAgentBackendService (offline dev).
	 */
	enableMockAgents: false,
	/** When live API is used and this is true, `streamRun()` consumes SSE from `/agents/sessions/:id/stream`. */
	enableAgentStreaming: false,
	enableSessionPersistence: true,
	/** When true, approval UI and pending state are meaningful. */
	enableApprovalGates: true,
	/**
	 * If true (with approval gates on): composer is disabled while the active run has a **pending** approval (“blocked”).
	 * If false: user may still send messages while approval is pending (“allow queue” / add context); backend should enforce policy.
	 */
	blockComposerWhenPendingApproval: true,
	enableBrowserWorkspace: true,
	enableDebugRuntimeLogs: true,
};
