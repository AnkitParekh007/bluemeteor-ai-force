import { Controller, Get } from '@nestjs/common';

import { Public } from './auth/decorators/public.decorator';
import { AppConfigService } from './config/app-config.service';

@Controller()
export class AppController {
	constructor(private readonly config: AppConfigService) {}

	@Public()
	@Get('health')
	health(): Record<string, unknown> {
		return {
			status: 'ok',
			service: 'bluemeteor-ai-force-server',
			timestamp: new Date().toISOString(),
			version: this.config.appVersion,
			environment: this.config.nodeEnv,
		};
	}

	@Public()
	@Get('live')
	live(): Record<string, unknown> {
		return { status: 'alive' };
	}
}
