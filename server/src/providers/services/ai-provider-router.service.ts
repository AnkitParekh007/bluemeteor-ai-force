import { Injectable, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';

import { AppConfigService } from '../../config/app-config.service';
import type { AiProvider } from '../models/ai-provider.model';
import type { AiProviderRequest, AiProviderResponse, AiProviderStreamEvent } from '../models/ai-provider.model';
import { AnthropicProviderService } from './anthropic-provider.service';
import { LocalAiProviderService } from './local-ai-provider.service';
import { MockAiProviderService } from './mock-ai-provider.service';
import { OpenAiProviderService } from './openai-provider.service';

export interface ProviderHealth {
	readonly name: string;
	readonly ok: boolean;
	readonly message?: string;
}

@Injectable()
export class AiProviderRouterService {
	private readonly log = new Logger(AiProviderRouterService.name);

	constructor(
		private readonly config: AppConfigService,
		private readonly mock: MockAiProviderService,
		private readonly openai: OpenAiProviderService,
		private readonly anthropic: AnthropicProviderService,
		private readonly local: LocalAiProviderService,
	) {}

	getActiveProviderName(): string {
		return this.getActiveProvider().name;
	}

	getProviderHealth(): ProviderHealth[] {
		return [
			{ name: 'mock', ok: true },
			{
				name: 'openai',
				ok: !!this.config.openAiApiKey,
				message: this.config.openAiApiKey ? undefined : 'OPENAI_API_KEY missing',
			},
			{
				name: 'anthropic',
				ok: !!this.config.anthropicApiKey,
				message: this.config.anthropicApiKey ? undefined : 'ANTHROPIC_API_KEY missing',
			},
			{ name: 'local', ok: true, message: 'Requires Ollama at LOCAL_MODEL_BASE_URL' },
		];
	}

	getActiveProvider(): AiProvider {
		const want = this.config.agentProvider;

		const missingKeyError = (providerLabel: string, envVar: string): Error =>
			new Error(`${providerLabel} provider selected but ${envVar} is not configured.`);

		const maybeFallback = (err: Error): AiProvider => {
			if (this.config.allowProviderFallback && this.config.isDevelopment) {
				this.log.warn(`${err.message} — falling back to mock provider.`);
				return this.mock;
			}
			throw err;
		};

		switch (want) {
			case 'openai':
				if (!this.config.openAiApiKey) return maybeFallback(missingKeyError('OpenAI', 'OPENAI_API_KEY'));
				return this.openai;
			case 'anthropic':
				if (!this.config.anthropicApiKey) return maybeFallback(missingKeyError('Anthropic', 'ANTHROPIC_API_KEY'));
				return this.anthropic;
			case 'local':
				return this.local;
			default:
				return this.mock;
		}
	}

	async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
		try {
			return await this.getActiveProvider().generate(request);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (this.config.allowProviderFallback && this.config.isDevelopment && this.config.agentProvider !== 'mock') {
				this.log.warn(`generate() failed (${msg}). Falling back to mock.`);
				return this.mock.generate(request);
			}
			throw e instanceof Error ? e : new Error(msg);
		}
	}

	stream(request: AiProviderRequest): Observable<AiProviderStreamEvent> {
		try {
			return this.getActiveProvider().stream(request);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return throwError(() => new Error(msg));
		}
	}

	streamWithFallback(request: AiProviderRequest): Observable<AiProviderStreamEvent> {
		try {
			return this.getActiveProvider().stream(request);
		} catch {
			return new Observable((sub) => {
				void (async () => {
					try {
						const res = await this.generate(request);
						const chunks = res.content.match(/.{1,32}/gs) ?? [res.content];
						for (const c of chunks) sub.next({ type: 'token', token: c });
						sub.next({ type: 'completed', content: res.content });
						sub.complete();
					} catch (err) {
						sub.error(err);
					}
				})();
			});
		}
	}
}
