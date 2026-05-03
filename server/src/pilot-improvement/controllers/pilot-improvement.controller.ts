import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
} from '@nestjs/common';

import { RequireAnyPermissions } from '../../auth/decorators/require-any-permissions.decorator';
import { CreateImprovementItemDto } from '../dto/create-improvement-item.dto';
import { GenerateImprovementRecommendationsDto } from '../dto/generate-improvement-recommendations.dto';
import { TriageFeedbackDto } from '../dto/triage-feedback.dto';
import { UpdateImprovementItemDto } from '../dto/update-improvement-item.dto';
import type { FeedbackTriageCategory, FeedbackSeverity, FeedbackTriageStatus } from '../models/feedback-triage.model';
import type { ImprovementCategory, ImprovementPriority, ImprovementStatus } from '../models/agent-improvement-backlog.model';
import { AgentImprovementBacklogService } from '../services/agent-improvement-backlog.service';
import { AgentImprovementRecommendationService } from '../services/agent-improvement-recommendation.service';
import { AgentImprovementReportService } from '../services/agent-improvement-report.service';
import { AgentRegressionAnalysisService } from '../services/agent-regression-analysis.service';
import { EvaluationCaseGeneratorService } from '../services/evaluation-case-generator.service';
import { FeedbackTriageService } from '../services/feedback-triage.service';

@Controller('pilot-improvement')
export class PilotImprovementController {
	constructor(
		private readonly triageService: FeedbackTriageService,
		private readonly backlogService: AgentImprovementBacklogService,
		private readonly recommendations: AgentImprovementRecommendationService,
		private readonly regression: AgentRegressionAnalysisService,
		private readonly evalCaseGen: EvaluationCaseGeneratorService,
		private readonly report: AgentImprovementReportService,
	) {}

	// ——— Triage ———

	@Get('triage')
	@RequireAnyPermissions('system.debug.view', 'agents.manage', 'audit.view')
	async listTriage(
		@Query('agentSlug') agentSlug?: string,
		@Query('category') category?: string,
		@Query('severity') severity?: string,
		@Query('status') status?: string,
		@Query('from') from?: string,
		@Query('to') to?: string,
	) {
		return this.triageService.listTriage({
			agentSlug: agentSlug?.trim() || undefined,
			category: category?.trim() as FeedbackTriageCategory | undefined,
			severity: severity?.trim() as FeedbackSeverity | undefined,
			status: status?.trim() as FeedbackTriageStatus | undefined,
			from: from ? new Date(from) : undefined,
			to: to ? new Date(to) : undefined,
		});
	}

	@Post('triage/run')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async runTriage() {
		return this.triageService.runTriageBatch();
	}

	@Post('triage/:feedbackId')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async triageOne(@Param('feedbackId') feedbackId: string) {
		return this.triageService.triageFeedback(feedbackId);
	}

	@Patch('triage/:triageId')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async updateTriage(@Param('triageId') triageId: string, @Body() dto: TriageFeedbackDto) {
		return this.triageService.updateTriage(triageId, dto);
	}

	@Get('triage/stats')
	@RequireAnyPermissions('agents.manage', 'system.debug.view', 'agents.readiness.view')
	async triageStats() {
		return this.triageService.getTriageStats();
	}

	// ——— Backlog ———

	@Get('backlog')
	@RequireAnyPermissions('agents.manage', 'system.debug.view', 'agents.readiness.view')
	async listBacklog(
		@Query('agentSlug') agentSlug?: string,
		@Query('category') category?: string,
		@Query('priority') priority?: string,
		@Query('status') status?: string,
	) {
		return this.backlogService.listItems({
			agentSlug: agentSlug?.trim() || undefined,
			category: category?.trim() as ImprovementCategory | undefined,
			priority: priority?.trim() as ImprovementPriority | undefined,
			status: status?.trim() as ImprovementStatus | undefined,
		});
	}

	@Post('backlog')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async createBacklogItem(@Body() dto: CreateImprovementItemDto) {
		return this.backlogService.createItem(dto);
	}

	@Patch('backlog/:id')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async updateBacklogItem(@Param('id') id: string, @Body() dto: UpdateImprovementItemDto) {
		return this.backlogService.updateItem(id, dto);
	}

	@Post('backlog/:id/accept')
	@RequireAnyPermissions('agents.manage')
	async acceptBacklogItem(@Param('id') id: string) {
		return this.backlogService.acceptItem(id);
	}

	@Post('backlog/:id/reject')
	@RequireAnyPermissions('agents.manage')
	async rejectBacklogItem(@Param('id') id: string) {
		return this.backlogService.rejectItem(id);
	}

	@Post('backlog/:id/implemented')
	@RequireAnyPermissions('agents.manage')
	async markImplemented(@Param('id') id: string) {
		return this.backlogService.markImplemented(id);
	}

	@Post('backlog/:id/validated')
	@RequireAnyPermissions('agents.manage')
	async markValidated(@Param('id') id: string) {
		return this.backlogService.markValidated(id);
	}

	@Post('backlog/:id/close')
	@RequireAnyPermissions('agents.manage')
	async closeBacklogItem(@Param('id') id: string) {
		return this.backlogService.closeItem(id);
	}

	@Get('backlog/stats')
	@RequireAnyPermissions('agents.manage', 'system.debug.view', 'agents.readiness.view')
	async backlogStats() {
		return this.backlogService.getBacklogStats();
	}

	// ——— Recommendations ———

	@Post('recommendations/generate')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async generateRecommendations(@Body() dto: GenerateImprovementRecommendationsDto) {
		return this.recommendations.generateRecommendations(dto.agentSlug);
	}

	@Post('recommendations/from-triage/:triageId')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async generateFromTriage(@Param('triageId') triageId: string) {
		return this.recommendations.generateFromTriage(triageId);
	}

	@Post('recommendations/failed-runs/:agentSlug')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async generateFromFailedRuns(@Param('agentSlug') agentSlug: string) {
		return this.recommendations.generateFromFailedRuns(agentSlug);
	}

	@Post('recommendations/evaluation-failures/:agentSlug')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async generateFromEvalFailures(@Param('agentSlug') agentSlug: string) {
		return this.recommendations.generateFromEvaluationFailures(agentSlug);
	}

	// ——— Evaluation case generation ———

	@Post('evaluation-case/from-feedback/:feedbackId')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async createEvalCaseFromFeedback(@Param('feedbackId') feedbackId: string) {
		return this.evalCaseGen.createFromFeedback(feedbackId);
	}

	@Post('evaluation-case/from-backlog/:backlogItemId')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async createEvalCaseFromBacklog(@Param('backlogItemId') backlogItemId: string) {
		return this.evalCaseGen.createFromBacklogItem(backlogItemId);
	}

	// ——— Regression ———

	@Get('regression/:agentSlug')
	@RequireAnyPermissions('agents.manage', 'system.debug.view', 'agents.readiness.view')
	async getRegressionSummary(@Param('agentSlug') agentSlug: string) {
		return this.regression.summariseImprovement(agentSlug);
	}

	// ——— Report ———

	@Get('report')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async getReport() {
		return this.report.generateReport();
	}

	@Get('report/markdown')
	@RequireAnyPermissions('agents.manage', 'system.debug.view')
	async getReportMarkdown() {
		const { markdown } = await this.report.generateReport();
		return { markdown };
	}
}
