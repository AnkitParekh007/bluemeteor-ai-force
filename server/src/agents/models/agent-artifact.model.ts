export type AgentArtifactType =
	| 'markdown'
	| 'code'
	| 'typescript'
	| 'html'
	| 'css'
	| 'json'
	| 'sql'
	| 'yaml'
	| 'test'
	| 'checklist'
	| 'email'
	| 'document'
	| 'report'
	| 'playwright_spec'
	| 'test_report'
	| 'browser_screenshot'
	| 'browser_trace'
	| 'browser_video';

export interface AgentArtifact {
	readonly id: string;
	readonly sessionId: string;
	readonly runId?: string;
	readonly agentSlug: string;
	readonly type: AgentArtifactType;
	readonly title: string;
	readonly description?: string;
	readonly content: string;
	readonly language?: string;
	readonly createdAt: string;
	readonly updatedAt?: string;
	readonly metadata?: Record<string, unknown>;
}
