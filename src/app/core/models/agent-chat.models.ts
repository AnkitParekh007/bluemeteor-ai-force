/** Client-side models for the Agent Workbench chat loop (mock transport for now). */

export type AgentMode = 'ask' | 'plan' | 'act';

export interface AgentMessage {
	readonly id: string;
	readonly role: 'user' | 'agent';
	readonly content: string;
	readonly timestamp: Date;
	readonly modeAtSend?: AgentMode;
}

export interface AgentTaskTemplate {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly category: string;
	readonly prompt: string;
}

export interface AgentRunRequest {
	readonly agentSlug: string;
	readonly mode: AgentMode;
	readonly message: string;
	readonly conversationId: string;
}

export interface AgentArtifact {
	readonly id: string;
	readonly title: string;
	readonly type: 'markdown' | 'code' | 'checklist' | 'table';
	readonly content: string;
	readonly createdAt: Date;
}

export interface AgentRunResponse {
	readonly message: string;
	readonly artifacts?: AgentArtifact[];
	readonly suggestedActions?: string[];
}
