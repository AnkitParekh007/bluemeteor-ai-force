import { Controller, Get } from '@nestjs/common';

import { Public } from './auth/decorators/public.decorator';
import { AppConfigService } from './config/app-config.service';
import { PrismaService } from './database/prisma.service';
import { AiProviderRouterService } from './providers/services/ai-provider-router.service';

@Controller()
export class AppController {
	constructor(
		private readonly config: AppConfigService,
		private readonly prisma: PrismaService,
		private readonly router: AiProviderRouterService,
	) {}

	@Public()
	@Get('health')
	async health(): Promise<Record<string, unknown>> {
		let database: Record<string, unknown> = { ok: false };
		let ragDocuments = 0;
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			database = { ok: true };
			ragDocuments = await this.prisma.ragDocument.count();
		} catch (e) {
			database = {
				ok: false,
				error: e instanceof Error ? e.message : 'database_error',
			};
		}

		return {
			status: database.ok === true ? 'ok' : 'degraded',
			service: 'bluemeteor-ai-force-agent-server',
			timestamp: new Date().toISOString(),
			authEnabled: true,
			rbacEnabled: this.config.enableRbac,
			provider: this.config.agentProvider,
			providerHealth: this.router.getProviderHealth(),
			database,
			ragDocuments,
			streamingEnabled: this.config.streamingEnabled,
		};
	}
}
