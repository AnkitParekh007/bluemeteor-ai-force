import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Observable, Subscriber } from 'rxjs';

import { AppConfigService } from '../../config/app-config.service';
import type { AiProvider } from '../models/ai-provider.model';
import type { AiProviderRequest, AiProviderResponse, AiProviderStreamEvent } from '../models/ai-provider.model';
import { userWithToolContext } from '../utils/user-with-tool-context';

@Injectable()
export class AnthropicProviderService implements AiProvider {
	readonly name = 'anthropic';
	private client: Anthropic | null = null;

	constructor(private readonly config: AppConfigService) {}

	private getClient(): Anthropic {
		const key = this.config.anthropicApiKey;
		if (!key) {
			throw new Error('Anthropic provider selected but ANTHROPIC_API_KEY is not configured.');
		}
		if (!this.client) {
			this.client = new Anthropic({ apiKey: key });
		}
		return this.client;
	}

	async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
		try {
			const client = this.getClient();
			const historyText = request.history
				.map((h) => `${h.role}: ${h.content}`)
				.join('\n');
			const userBlock = [historyText, `user: ${userWithToolContext(request)}`].filter(Boolean).join('\n\n');

			const msg = await client.messages.create({
				model: this.config.anthropicModel,
				max_tokens: 4096,
				system: `${request.systemPrompt}\n\nMode: ${request.mode}. Respond in markdown.`,
				messages: [{ role: 'user', content: userBlock }],
			});
			const text =
				msg.content[0]?.type === 'text'
					? msg.content[0].text
					: '';
			return {
				content: text,
				tokensUsed:
					(msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0),
				model: this.config.anthropicModel,
				provider: this.name,
			};
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			throw new Error(`Anthropic request failed: ${msg}`);
		}
	}

	stream(request: AiProviderRequest): Observable<AiProviderStreamEvent> {
		return new Observable((sub: Subscriber<AiProviderStreamEvent>) => {
			void (async () => {
				try {
					const client = this.getClient();
					const historyText = request.history
						.map((h) => `${h.role}: ${h.content}`)
						.join('\n');
					const userBlock = [historyText, `user: ${userWithToolContext(request)}`].filter(Boolean).join('\n\n');

					const stream = client.messages.stream({
						model: this.config.anthropicModel,
						max_tokens: 4096,
						system: `${request.systemPrompt}\n\nMode: ${request.mode}. Respond in markdown.`,
						messages: [{ role: 'user', content: userBlock }],
					});

					let full = '';
					for await (const event of stream) {
						if (
							event.type === 'content_block_delta' &&
							event.delta.type === 'text_delta'
						) {
							const t = event.delta.text;
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
