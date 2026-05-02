import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PlaywrightSpecRepository } from './repositories/playwright-spec.repository';
import { PlaywrightTestRunnerService } from './services/playwright-test-runner.service';

@Controller('testing/playwright')
export class PlaywrightTestingController {
	constructor(
		private readonly runner: PlaywrightTestRunnerService,
		private readonly specs: PlaywrightSpecRepository,
	) {}

	@Get('runs')
	@RequirePermissions('tools.view')
	listRuns(@Query('sessionId') sessionId: string) {
		if (!sessionId?.trim()) return [];
		return this.runner.listTestRuns(sessionId.trim());
	}

	@Get('runs/:testRunId')
	@RequirePermissions('tools.view')
	getRun(@Param('testRunId') testRunId: string) {
		return this.runner.getTestRun(testRunId);
	}

	@Get('specs')
	@RequirePermissions('tools.view')
	listSpecs(@Query('sessionId') sessionId: string) {
		if (!sessionId?.trim()) return [];
		return this.specs.listBySessionId(sessionId.trim());
	}

	@Get('specs/:specId')
	@RequirePermissions('tools.view')
	async getSpec(@Param('specId') specId: string) {
		const s = await this.specs.findById(specId);
		if (!s) return null;
		return s;
	}

	@Post('specs/generate')
	@RequirePermissions('tools.execute.low')
	generateSpec(
		@Body()
		body: {
			sessionId: string;
			runId?: string;
			agentSlug: string;
			title: string;
			message?: string;
		},
	) {
		return this.runner.generateSpecArtifact({
			sessionId: body.sessionId,
			runId: body.runId,
			agentSlug: body.agentSlug,
			title: body.title,
			message: body.message,
		});
	}

	@Post('specs/:specId/validate')
	@RequirePermissions('tools.execute.medium')
	async validateSpec(@Param('specId') specId: string) {
		const spec = await this.specs.findById(specId);
		if (!spec) return { valid: false, reasons: ['not_found'] };
		const v = this.runner.validateGeneratedSpec(spec.content);
		if (v.valid) await this.specs.update(specId, { status: 'validated', updatedAt: new Date() });
		else await this.specs.update(specId, { status: 'blocked', updatedAt: new Date() });
		return v;
	}

	@Post('templates/:templateKey/run')
	@RequirePermissions('tools.execute.medium')
	runTemplate(
		@Param('templateKey') templateKey: string,
		@Body()
		body: { sessionId: string; runId?: string; agentSlug: string; profileId?: string },
	) {
		return this.runner.runTemplateTest({
			templateKey,
			sessionId: body.sessionId,
			runId: body.runId,
			agentSlug: body.agentSlug,
			profileId: body.profileId,
		});
	}

	@Post('specs/:specId/run')
	@RequirePermissions('tools.execute.high')
	runSpec(
		@Param('specId') specId: string,
		@Body()
		body: { sessionId: string; runId?: string; agentSlug: string; profileId?: string },
	) {
		return this.runner.runValidatedSpec({
			specId,
			sessionId: body.sessionId,
			runId: body.runId,
			agentSlug: body.agentSlug,
			profileId: body.profileId,
		});
	}
}
