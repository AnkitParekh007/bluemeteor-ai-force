export const environment = {
	production: true,
	deployEnv: 'production' as const,
	/** Nest orchestrator: same base as Angular `/api` proxy or gateway. */
	agentApiBaseUrl: '/api',
	/** Production uses real Nest API — mock transport is off (see `AgentSendResponse` contract on POST …/messages). */
	enableMockAgents: false,
	enableAgentStreaming: true,
	enableSessionPersistence: true,
	enableApprovalGates: true,
	/** Default strict: no new user messages until pending approvals resolve. Set false to allow queued follow-ups. */
	blockComposerWhenPendingApproval: true,
	enableBrowserWorkspace: true,
	enableDebugRuntimeLogs: false,
};
