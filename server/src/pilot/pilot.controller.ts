import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import type { AuthUser } from '../auth/models/auth-user.model';
import { SubmitPilotFeedbackDto } from './dto/submit-pilot-feedback.dto';
import { PilotFeedbackService } from './services/pilot-feedback.service';
import { PilotMetricsService } from './services/pilot-metrics.service';
import { PilotReadinessService } from './services/pilot-readiness.service';
import { PilotReportService } from './services/pilot-report.service';

@Controller('pilot')
export class PilotController {
	constructor(
		private readonly feedback: PilotFeedbackService,
		private readonly metrics: PilotMetricsService,
		private readonly readiness: PilotReadinessService,
		private readonly report: PilotReportService,
	) {}

	@Post('feedback')
	async submitFeedback(@CurrentUser() user: AuthUser | undefined, @Body() dto: SubmitPilotFeedbackDto) {
		return this.feedback.submit(user, dto);
	}

	@Get('feedback')
	@RequireAnyPermissions('system.debug.view', 'system.admin')
	async listFeedback(
		@Query('limit') limit?: string,
		@Query('agentSlug') agentSlug?: string,
		@Query('userRole') userRole?: string,
		@Query('minRating') minRating?: string,
		@Query('maxRating') maxRating?: string,
		@Query('from') from?: string,
		@Query('to') to?: string,
	) {
		const n = Math.min(500, Math.max(1, Number(limit ?? '200') || 200));
		return this.feedback.list(n, {
			agentSlug: agentSlug?.trim() || undefined,
			userRole: userRole?.trim() || undefined,
			minRating: minRating != null && minRating !== '' ? Number(minRating) : undefined,
			maxRating: maxRating != null && maxRating !== '' ? Number(maxRating) : undefined,
			from: from ? new Date(from) : undefined,
			to: to ? new Date(to) : undefined,
		});
	}

	@Get('metrics')
	@RequireAnyPermissions('system.debug.view', 'system.admin')
	async pilotMetrics() {
		return this.metrics.getMetrics();
	}

	@Get('readiness')
	@RequireAnyPermissions('system.debug.view', 'agents.readiness.view', 'system.admin')
	async pilotReadiness() {
		return this.readiness.getReadinessGate();
	}

	@Get('report')
	@RequireAnyPermissions('system.debug.view', 'system.admin')
	async pilotReport() {
		return this.report.generatePilotReport();
	}
}
