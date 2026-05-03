import { Controller, Get } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { StartupValidationService } from '../config/startup-validation.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('security')
export class SecurityController {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly startup: StartupValidationService,
	) {}

	@Get('health')
	@RequirePermissions('system.debug.view')
	health(): Record<string, unknown> {
		const warnings: string[] = [];
		if (this.cfg.isDevelopment) {
			if (this.cfg.jwtAccessSecret.includes('dev-only')) warnings.push('Using development JWT secrets.');
			if (this.cfg.streamTokenSecret.includes(':stream')) warnings.push('Stream token secret is dev-derived.');
			if (this.cfg.authDemoUsersEnabled) warnings.push('Demo users are enabled.');
			if (this.cfg.enableConnectorMockFallback) warnings.push('Connector mock fallback is enabled.');
		}
		const v = this.startup.evaluateSync();
		warnings.push(...v.warnings);
		return {
			authEnabled: true,
			rbacEnabled: this.cfg.enableRbac,
			rateLimitingEnabled: this.cfg.enableRateLimiting,
			streamTokensEnabled: true,
			directBrowserDebugEndpointsEnabled: this.cfg.enableDirectBrowserDebugEndpoints,
			mcpEnabled: this.cfg.enableMcpAdapter,
			connectorMockFallbackEnabled: this.cfg.enableConnectorMockFallback,
			demoUsersEnabled: this.cfg.authDemoUsersEnabled,
			productionSafetyPassed: v.ok && v.errors.length === 0,
			startupErrors: v.errors,
			warnings,
		};
	}
}
