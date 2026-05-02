import { Injectable } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';

import { AppConfigService } from '../../config/app-config.service';
import type { AiProvider } from '../models/ai-provider.model';
import type { AiProviderRequest, AiProviderResponse, AiProviderStreamEvent } from '../models/ai-provider.model';
import { userWithToolContext } from '../utils/user-with-tool-context';

@Injectable()
export class LocalAiProviderService implements AiProvider {
	readonly name = 'local';

	constructor(private readonly config: AppConfigService) {}

	async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
		const base = this.config.localModelBaseUrl.replace(/\/$/, '');
		const model = this.config.localModelName;
		const messages = [
			{ role: 'system' as const, content: request.systemPrompt },
			...request.history.map((h) => ({
				role: h.role === 'agent' ? ('assistant' as const) : h.role === 'user' ? ('user' as const) : ('system' as const),
				content: h.content,
			})),
			{ role: 'user' as const, content: userWithToolContext(request) },
		];
		try {
			const res = await fetch(`${base}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model, messages, stream: false }),
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const data = (await res.json()) as { message?: { content?: string } };
			const content = data.message?.content ?? '';
			return { content, provider: this.name, model };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			throw new Error(`Local model unavailable (${msg}). Start Ollama or switch AGENT_PROVIDER=mock.`);
		}
	}

	stream(request: AiProviderRequest): Observable<AiProviderStreamEvent> {
		return new Observable((sub: Subscriber<AiProviderStreamEvent>) => {
			void (async () => {
				try {
					const full = (await this.generate(request)).content;
					for (const chunk of chunkText(full, 24)) {
						sub.next({ type: 'token', token: chunk });
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

function chunkText(s: string, size: number): string[] {
	const out: string[] = [];
	for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
	return out.length ? out : [''];
}
