export type AgentMessageRole = 'user' | 'agent' | 'system' | 'tool';

export type AgentMessageStatus = 'sending' | 'streaming' | 'done' | 'error';

export interface AgentMessage {
	readonly id: string;
	readonly sessionId: string;
	readonly role: AgentMessageRole;
	readonly content: string;
	readonly createdAt: string;
	readonly status?: AgentMessageStatus;
	readonly metadata?: Record<string, unknown>;
}
