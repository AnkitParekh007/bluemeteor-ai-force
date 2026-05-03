import { applyDecorators, Controller, Get, NotFoundException } from '@nestjs/common';

import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppConfigService } from '../config/app-config.service';
import { MetricsService } from './services/metrics.service';
import { ReadinessService } from './services/readiness.service';

function MetricsRouteDecorators() {
	if (process.env.METRICS_PUBLIC === 'true') {
		return applyDecorators(Public(), Get('metrics'));
	}
	return applyDecorators(RequirePermissions('system.debug.view'), Get('metrics'));
}

@Controller()
export class OpsController {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly metricsService: MetricsService,
		private readonly readiness: ReadinessService,
	) {}

	@Public()
	@Get('ready')
	async ready(): Promise<Record<string, unknown>> {
		return this.readiness.evaluate();
	}

	@MetricsRouteDecorators()
	async getMetrics(): Promise<Record<string, unknown>> {
		if (!this.cfg.enableMetrics) {
			throw new NotFoundException();
		}
		return this.metricsService.snapshot();
	}
}
