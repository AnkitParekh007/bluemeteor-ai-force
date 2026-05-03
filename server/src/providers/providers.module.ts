import { Global, Module } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { StartupValidationService } from '../config/startup-validation.service';
import { AiProviderRouterService } from './services/ai-provider-router.service';
import { AnthropicProviderService } from './services/anthropic-provider.service';
import { LocalAiProviderService } from './services/local-ai-provider.service';
import { MockAiProviderService } from './services/mock-ai-provider.service';
import { OpenAiProviderService } from './services/openai-provider.service';

@Global()
@Module({
	providers: [
		AppConfigService,
		StartupValidationService,
		MockAiProviderService,
		OpenAiProviderService,
		AnthropicProviderService,
		LocalAiProviderService,
		AiProviderRouterService,
	],
	exports: [AppConfigService, StartupValidationService, AiProviderRouterService, MockAiProviderService],
})
export class ProvidersModule {}
