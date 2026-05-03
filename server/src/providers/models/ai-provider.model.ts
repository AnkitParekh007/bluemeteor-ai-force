import type { Observable } from 'rxjs';

import type { AgentWorkspaceMode } from '../../agents/models/agent-session.model';

export interface AiProviderRequest {
	readonly agentSlug: string;
	readonly systemPrompt: string;
	readonly mode: AgentWorkspaceMode;
	readonly userMessage: string;
	readonly context?: Record<string, unknown>;
	/** Appended to the user message by providers (tool results, DOM summary, test output). */
	readonly toolContextBlock?: string;
	readonly history: { role: 'user' | 'agent' | 'system'; content: string }[];
}

export interface AiProviderResponse {
	readonly content: string;
	readonly tokensUsed?: number;
	readonly model?: string;
	readonly provider?: string;
	readonly metadata?: Record<string, unknown>;
}

export type AiProviderStreamEventType = 'token' | 'completed' | 'failed';

export interface AiProviderStreamEvent {
	readonly type: AiProviderStreamEventType;
	readonly token?: string;
	readonly content?: string;
	readonly error?: string;
}

export interface AiProvider {
	readonly name: string;
	generate(request: AiProviderRequest): Promise<AiProviderResponse>;
	stream(request: AiProviderRequest): Observable<AiProviderStreamEvent>;
}
