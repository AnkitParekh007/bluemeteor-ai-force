import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';

import { RequireAnyPermissions } from '../../auth/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { RunEvaluationOptions } from '../models/agent-evaluation.model';
import { AgentEvaluationRepository } from '../repositories/agent-evaluation.repository';
import { AgentEvaluationService } from '../services/agent-evaluation.service';

@Controller('agent-intelligence/evaluations')
export class AgentEvaluationsController {
	constructor(
		private readonly evaluations: AgentEvaluationService,
		private readonly repo: AgentEvaluationRepository,
	) {}

	@Get('readiness/:agentSlug')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	async readiness(@Param('agentSlug') agentSlug: string) {
		const counts = await this.repo.countActiveIntelligence(agentSlug);
		const latest = await this.repo.latestRunScore(agentSlug);
		return { agentSlug, ...counts, latestEvaluation: latest };
	}

	@Get('cases')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	listCases(@Query('agentSlug') agentSlug?: string) {
		return this.evaluations.listCases(agentSlug);
	}

	@Post('cases')
	@RequirePermissions('agents.manage')
	createCase(@Body() body: Record<string, unknown>) {
		return this.evaluations.createCase({
			agentSlug: String(body['agentSlug'] ?? ''),
			key: String(body['key'] ?? ''),
			name: String(body['name'] ?? ''),
			description: body['description'] !== undefined ? String(body['description']) : undefined,
			inputPrompt: String(body['inputPrompt'] ?? ''),
			expectedBehaviors: (body['expectedBehaviors'] as string[]) ?? [],
			expectedArtifacts: (body['expectedArtifacts'] as string[]) ?? [],
			expectedTools: (body['expectedTools'] as string[]) ?? [],
			category: String(body['category'] ?? 'general'),
			priority: body['priority'] as 'low' | 'medium' | 'high' | 'critical',
			status: (body['status'] as 'active' | 'disabled') ?? 'active',
			metadata: body['metadata'] as Record<string, unknown> | undefined,
		});
	}

	@Patch('cases/:id')
	@RequirePermissions('agents.manage')
	updateCase(@Param('id') id: string, @Body() body: Record<string, unknown>) {
		return this.evaluations.updateCase(id, body as never);
	}

	@Post('run')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	run(@Body() body: { agentSlug: string; options?: RunEvaluationOptions }) {
		return this.evaluations.runEvaluation(body.agentSlug, body.options ?? {});
	}

	@Post('cases/:id/run')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	runOne(@Param('id') id: string, @Body() body: { options?: RunEvaluationOptions }) {
		return this.evaluations.runSingleCase(id, body.options ?? {});
	}

	@Get('runs')
	@RequirePermissions('agents.readiness.view')
	listRuns(@Query('agentSlug') agentSlug?: string) {
		return this.evaluations.listEvaluationRuns(agentSlug);
	}

	@Get('runs/:id')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	async getRun(@Param('id') id: string) {
		const r = await this.evaluations.getEvaluationRun(id);
		if (!r) throw new NotFoundException();
		return r;
	}
}
