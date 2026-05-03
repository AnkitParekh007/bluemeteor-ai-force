import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AgentOrchestratorService } from '../../agents/services/agent-orchestrator.service';
import { AgentSessionService } from '../../agents/services/agent-session.service';
import { AgentEventBusService } from '../../agents/services/agent-event-bus.service';
import type { AgentRuntimeEvent } from '../../agents/models/agent-runtime-event.model';
import { EVALUATION_TOOL_BLOCKLIST, MAX_EVAL_CASES_PER_RUN } from '../constants/evaluation-safety';
import type {
	AgentEvaluationCase,
	AgentEvaluationRun,
	RunEvaluationOptions,
} from '../models/agent-evaluation.model';
import { AgentEvaluationRepository } from '../repositories/agent-evaluation.repository';
import { AgentQualityScorerService, type ScoreCaseInput } from './agent-quality-scorer.service';
import { newId } from '../../common/utils/ids';
import { isoNow } from '../../common/utils/dates';

@Injectable()
export class AgentEvaluationService {
	private readonly log = new Logger(AgentEvaluationService.name);

	constructor(
		private readonly repo: AgentEvaluationRepository,
		private readonly scorer: AgentQualityScorerService,
		private readonly sessions: AgentSessionService,
		@Inject(forwardRef(() => AgentOrchestratorService))
		private readonly orchestrator: AgentOrchestratorService,
		private readonly events: AgentEventBusService,
	) {}

	async listCases(agentSlug?: string): Promise<AgentEvaluationCase[]> {
		return this.repo.listCases(agentSlug);
	}

	async createCase(
		input: Omit<AgentEvaluationCase, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
	): Promise<AgentEvaluationCase> {
		const id = input.id ?? newId('aec');
		return this.repo.createCase({
			id,
			agentSlug: input.agentSlug,
			key: input.key,
			name: input.name,
			description: input.description,
			inputPrompt: input.inputPrompt,
			expectedBehaviorsJson: JSON.stringify(input.expectedBehaviors),
			expectedArtifactsJson: JSON.stringify(input.expectedArtifacts ?? []),
			expectedToolsJson: JSON.stringify(input.expectedTools ?? []),
			category: input.category,
			priority: input.priority,
			status: input.status,
			metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined,
		});
	}

	async updateCase(caseId: string, patch: Partial<AgentEvaluationCase>): Promise<AgentEvaluationCase> {
		return this.repo.updateCase(caseId, {
			...(patch.name !== undefined ? { name: patch.name } : {}),
			...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
			...(patch.inputPrompt !== undefined ? { inputPrompt: patch.inputPrompt } : {}),
			...(patch.expectedBehaviors !== undefined
				? { expectedBehaviorsJson: JSON.stringify(patch.expectedBehaviors) }
				: {}),
			...(patch.expectedArtifacts !== undefined
				? { expectedArtifactsJson: JSON.stringify(patch.expectedArtifacts) }
				: {}),
			...(patch.expectedTools !== undefined ? { expectedToolsJson: JSON.stringify(patch.expectedTools) } : {}),
			...(patch.category !== undefined ? { category: patch.category } : {}),
			...(patch.priority !== undefined ? { priority: patch.priority } : {}),
			...(patch.status !== undefined ? { status: patch.status } : {}),
			...(patch.metadata !== undefined
				? { metadataJson: patch.metadata ? JSON.stringify(patch.metadata) : null }
				: {}),
		});
	}

	async runEvaluation(agentSlug: string, options: RunEvaluationOptions = {}): Promise<AgentEvaluationRun> {
		const runId = newId('aerun');
		const startedAt = new Date();
		const session = await this.sessions.createSession(agentSlug, 'plan');
		let cases = await this.repo.listCases(agentSlug);
		cases = cases.filter((c) => c.status === 'active');
		if (options.caseIds?.length) {
			const set = new Set(options.caseIds);
			cases = cases.filter((c) => set.has(c.id));
		}
		const max = Math.min(options.maxCases ?? MAX_EVAL_CASES_PER_RUN, MAX_EVAL_CASES_PER_RUN);
		cases = cases.slice(0, max);

		try {
			await this.repo.createRun({
				id: runId,
				agentSlug,
				promptTemplateId: options.promptTemplateId ?? null,
				skillPackId: options.skillPackId ?? null,
				status: 'running',
				totalCases: cases.length,
				passedCases: 0,
				failedCases: 0,
				score: 0,
				startedAt,
				metadataJson: JSON.stringify({
					useRealProvider: options.useRealProvider === true,
					allowBrowserAndTestTools: options.allowBrowserAndTestTools === true,
				}),
			});

			await this.emitEvalEvent('evaluation_run_started', runId, agentSlug, session.id, {
				totalCases: cases.length,
			});
			const results: AgentEvaluationRun['results'] = [];
			let passed = 0;
			let failed = 0;
			let scoreSum = 0;

			for (const c of cases) {
				const one = await this.runSingleCaseInternal(runId, session.id, c, options);
				results.push(one);
				scoreSum += one.score;
				if (one.status === 'passed') passed++;
				else failed++;
				await this.repo.createCaseResult({
					id: one.id,
					evaluationRunId: runId,
					evaluationCaseId: c.id,
					status: one.status,
					score: one.score,
					inputPrompt: one.inputPrompt,
					actualAnswer: one.actualAnswer ?? null,
					expectedSummary: one.expectedSummary ?? null,
					toolResultsJson: one.toolResults ? JSON.stringify(one.toolResults) : null,
					artifactResultsJson: one.artifactResults ? JSON.stringify(one.artifactResults) : null,
					issuesJson: JSON.stringify(one.issues),
					createdAt: new Date(one.createdAt),
				});
			}

			const score = cases.length ? Math.round((scoreSum / cases.length) * 10) / 10 : 0;
			await this.repo.updateRun(runId, {
				status: 'completed',
				passedCases: passed,
				failedCases: failed,
				score,
				completedAt: new Date(),
				resultJson: JSON.stringify({ results: results.map((r) => ({ id: r.id, status: r.status, score: r.score })) }),
			});
			await this.emitEvalEvent('evaluation_run_completed', runId, agentSlug, session.id, {
				passedCases: passed,
				failedCases: failed,
				score,
			});
		} catch (e) {
			const err = e instanceof Error ? e.message : String(e);
			this.log.error(`Evaluation run failed: ${err}`);
			await this.repo.updateRun(runId, {
				status: 'failed',
				error: err,
				completedAt: new Date(),
			});
			await this.emitEvalEvent('evaluation_run_completed', runId, agentSlug, session.id, {
				error: err,
				failed: true,
			});
		}

		return (await this.repo.getRunById(runId))!;
	}

	async runSingleCase(caseId: string, options: RunEvaluationOptions = {}): Promise<AgentEvaluationRun> {
		const c = await this.repo.findCaseById(caseId);
		if (!c) throw new NotFoundException(`Case ${caseId} not found`);
		return this.runEvaluation(c.agentSlug, { ...options, caseIds: [caseId], maxCases: 1 });
	}

	private async runSingleCaseInternal(
		evaluationRunId: string,
		sessionId: string,
		evalCase: AgentEvaluationCase,
		options: RunEvaluationOptions,
	): Promise<AgentEvaluationRun['results'][number]> {
		const allowBrowser = options.allowBrowserAndTestTools === true;
		const resp = await this.orchestrator.executeMessage({
			sessionId,
			agentSlug: evalCase.agentSlug,
			mode: 'plan',
			message: evalCase.inputPrompt,
			context: {
				evaluation: true,
				evalAllowBrowserAndTestTools: allowBrowser,
				useRealProvider: options.useRealProvider === true,
			},
		});

		const plannedToolIds = this.extractPlannedTools(resp.events);
		const filteredPlan = allowBrowser
			? plannedToolIds
			: plannedToolIds.filter((t) => !EVALUATION_TOOL_BLOCKLIST.has(t));

		const artifactTypes = resp.artifacts.map((a) => a.type);
		const scoreInput: ScoreCaseInput = {
			actualAnswer: resp.message.content,
			plannedToolIds: filteredPlan.length ? filteredPlan : plannedToolIds,
			artifactTypes,
		};
		return this.scorer.scoreCase(evaluationRunId, evalCase, scoreInput);
	}

	private extractPlannedTools(events: AgentRuntimeEvent[]): string[] {
		for (const e of events) {
			const tools = e.payload?.['tools'];
			if (Array.isArray(tools)) return tools.map(String);
		}
		return [];
	}

	private async emitEvalEvent(
		type: 'evaluation_run_started' | 'evaluation_run_completed',
		runId: string,
		agentSlug: string,
		sessionId: string,
		payload: Record<string, unknown>,
	): Promise<void> {
		await this.events.emit({
			id: newId('evt'),
			runId,
			sessionId,
			agentSlug,
			type,
			title: type.replace(/_/g, ' '),
			timestamp: isoNow(),
			payload,
		});
	}

	async getEvaluationRun(runId: string): Promise<AgentEvaluationRun | null> {
		return this.repo.getRunById(runId);
	}

	async listEvaluationRuns(agentSlug?: string): Promise<AgentEvaluationRun[]> {
		return this.repo.listRuns(agentSlug);
	}
}
