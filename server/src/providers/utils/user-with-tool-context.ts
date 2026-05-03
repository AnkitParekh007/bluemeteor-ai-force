import type { AiProviderRequest } from '../models/ai-provider.model';

/** Appends server-executed tool/browser observations to the user turn for the LLM. */
export function userWithToolContext(req: AiProviderRequest): string {
	if (!req.toolContextBlock?.trim()) return req.userMessage;
	return `${req.userMessage}\n\n### Tool and browser observations (server-executed; use in your answer)\n${req.toolContextBlock.trim()}`;
}
