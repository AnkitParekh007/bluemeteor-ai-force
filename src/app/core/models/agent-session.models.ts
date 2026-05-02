/** Workspace session + tool UI models (frontend/mock; backend-ready shapes). */

export type AgentSessionStatus =
	| 'active'
	| 'idle'
	| 'running'
	| 'completed'
	| 'failed'
	| 'archived';

export type AgentWorkspaceMode = 'ask' | 'plan' | 'act';

export type AgentToolTab =
	| 'browser'
	| 'artifacts'
	| 'console'
	| 'tests'
	| 'tools'
	| 'activity'
	| 'approvals';

export interface AgentSession {
	readonly id: string;
	readonly agentSlug: string;
	readonly title: string;
	readonly mode: AgentWorkspaceMode;
	readonly status: AgentSessionStatus;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly messageCount: number;
	readonly preview?: string;
}

export interface AgentChatMessage {
	readonly id: string;
	readonly sessionId: string;
	readonly role: 'user' | 'agent' | 'system' | 'tool';
	readonly content: string;
	readonly createdAt: string;
	readonly status?: 'sending' | 'streaming' | 'done' | 'error';
	readonly metadata?: Record<string, unknown>;
}

export interface AgentBrowserState {
	readonly isOpen: boolean;
	readonly currentUrl: string;
	readonly title: string;
	readonly loading: boolean;
	readonly screenshotUrl?: string;
}

export interface AgentConsoleEntry {
	readonly id: string;
	readonly level: 'info' | 'warning' | 'error' | 'success';
	readonly message: string;
	readonly source: 'agent' | 'browser' | 'tool' | 'system';
	readonly createdAt: string;
}

export interface AgentTestResult {
	readonly id: string;
	readonly title: string;
	readonly status: 'passed' | 'failed' | 'skipped' | 'running';
	readonly durationMs?: number;
	readonly error?: string;
}

export type AgentArtifactRecordType =
	| 'code'
	| 'markdown'
	| 'sql'
	| 'test'
	| 'json'
	| 'checklist';

export interface AgentArtifactRecord {
	readonly id: string;
	readonly sessionId: string;
	readonly title: string;
	readonly type: AgentArtifactRecordType;
	readonly content: string;
	readonly createdAt: string;
}

export interface AgentActivityEvent {
	readonly id: string;
	readonly sessionId: string;
	readonly kind:
		| 'session'
		| 'message'
		| 'agent'
		| 'artifact'
		| 'browser'
		| 'test'
		| 'system';
	readonly message: string;
	readonly createdAt: string;
}
