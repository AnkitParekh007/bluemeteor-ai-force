import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Observable, Subscriber } from 'rxjs';

import { AppConfigService } from '../../config/app-config.service';
import type { AiProvider } from '../models/ai-provider.model';
import type { AiProviderRequest, AiProviderResponse, AiProviderStreamEvent } from '../models/ai-provider.model';
import { userWithToolContext } from '../utils/user-with-tool-context';

@Injectable()
export class OpenAiProviderService implements AiProvider {
	readonly name = 'openai';
	private client: OpenAI | null = null;

	constructor(private readonly config: AppConfigService) {}

	private getClient(): OpenAI {
		const key = this.config.openAiApiKey;
		if (!key) {
			throw new Error('OpenAI provider selected but OPENAI_API_KEY is not configured.');
		}
		if (!this.client) {
			this.client = new OpenAI({ apiKey: key });
		}
		return this.client;
	}

	private toOpenAiMessages(
		request: AiProviderRequest,
	): OpenAI.ChatCompletionMessageParam[] {
		const dev = `Internal mode: ${request.mode}. Respond in clear markdown. Do not claim to have executed tools.`;
		const history = request.history.map((h) => ({
			role: h.role === 'agent' ? ('assistant' as const) : h.role === 'user' ? ('user' as const) : ('system' as const),
			content: h.content,
		}));
		return [
			{ role: 'system', content: request.systemPrompt },
			{ role: 'system', content: dev },
			...history,
			{ role: 'user', content: userWithToolContext(request) },
		];
	}

	async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
		try {
			const client = this.getClient();
			const res = await client.chat.completions.create({
				model: this.config.openAiModel,
				messages: this.toOpenAiMessages(request),
			});
			const content = res.choices[0]?.message?.content ?? '';
			return {
				content,
				tokensUsed: res.usage?.total_tokens,
				model: this.config.openAiModel,
				provider: this.name,
			};
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			throw new Error(`OpenAI request failed: ${msg}`);
		}
	}

	stream(request: AiProviderRequest): Observable<AiProviderStreamEvent> {
		return new Observable((sub: Subscriber<AiProviderStreamEvent>) => {
			void (async () => {
				try {
					const client = this.getClient();
					const stream = await client.chat.completions.create({
						model: this.config.openAiModel,
						messages: this.toOpenAiMessages(request),
						stream: true,
					});
					let full = '';
					for await (const part of stream) {
						const t = part.choices[0]?.delta?.content ?? '';
						if (t) {
							full += t;
							sub.next({ type: 'token', token: t });
						}
					}
					sub.next({ type: 'completed', content: full });
					sub.complete();
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e);
					sub.next({ type: 'failed', error: msg });
					sub.complete();
				}
			})();
		});
	}
}
