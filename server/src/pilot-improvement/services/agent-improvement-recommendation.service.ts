import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { FeedbackTriageCategory } from '../models/feedback-triage.model';
import type { ImprovementCategory, ImprovementPriority } from '../models/agent-improvement-backlog.model';
import { AgentImprovementBacklogRepository } from '../repositories/agent-improvement-backlog.repository';
import { FeedbackTriageRepository } from '../repositories/feedback-triage.repository';

interface RecommendationSpec {
	title: string;
	description: string;
	category: ImprovementCategory;
	priority: ImprovementPriority;
	proposedChange: {
		notes: string;
		promptTemplatePatch?: string;
		workflowSuggestion?: string;
		newEvaluationCase?: string;
	};
	expectedImpact: string;
}

const RECOMMENDATION_MAP: Record<FeedbackTriageCategory, RecommendationSpec[]> = {
	wrong_answer: [
		{
			title: 'Add grounding and citation rules to agent prompt',
			description:
				'Update the system prompt to require the agent to cite available context and state when it cannot answer definitively.',
			category: 'prompt',
			priority: 'high',
			proposedChange: {
				notes: 'Add to system prompt: "Only make claims that are supported by provided context. If the answer is unknown, say so explicitly."',
				promptTemplatePatch: 'Append to system prompt: "Only make claims supported by provided context. If unsure, state: I do not have enough context to answer this accurately."',
			},
			expectedImpact: 'Reduces factually incorrect responses and hallucinations.',
		},
		{
			title: 'Create evaluation case for wrong-answer scenario',
			description: 'Add a golden evaluation case capturing the failure scenario.',
			category: 'evaluation_case',
			priority: 'high',
			proposedChange: {
				notes: 'Create evaluation case from the failing feedback.',
				newEvaluationCase: 'Use feedback.whatFailed as the test input; expect accurate answer or "insufficient context" response.',
			},
			expectedImpact: 'Enables regression testing for this failure class.',
		},
	],
	incomplete_answer: [
		{
			title: 'Update response-style prompt for completeness',
			description: 'Ensure the agent prompt instructs the agent to cover all required sections in its response.',
			category: 'prompt',
			priority: 'medium',
			proposedChange: {
				notes: 'Add completeness checklist to the agent system prompt.',
				promptTemplatePatch: 'Append: "Ensure your response addresses all sub-questions and includes any requested artifacts."',
			},
			expectedImpact: 'Reduces incomplete responses.',
		},
		{
			title: 'Add completeness step to agent workflow',
			description: 'Add a workflow step that verifies all required outputs are present before returning.',
			category: 'workflow',
			priority: 'medium',
			proposedChange: {
				workflowSuggestion: 'Add a final "output verification" step to check artifact types and response completeness.',
			},
			expectedImpact: 'Reduces missing sections in structured agent responses.',
		},
	],
	missing_artifact: [
		{
			title: 'Update workflow template to include artifact generation',
			description: 'Add the required artifact type to the workflow outputArtifactTypes and add a generation step.',
			category: 'workflow',
			priority: 'high',
			proposedChange: {
				workflowSuggestion: 'Add outputArtifactType for the missing artifact. Add a generation step before final response.',
			},
			expectedImpact: 'Ensures agent generates expected artifacts consistently.',
		},
		{
			title: 'Create evaluation case requiring expected artifact',
			description: 'Add an evaluation case that expects the artifact to be present in the output.',
			category: 'evaluation_case',
			priority: 'high',
			proposedChange: {
				newEvaluationCase: 'Set expectedArtifacts to include the missing artifact type.',
			},
			expectedImpact: 'Prevents regression on artifact generation.',
		},
	],
	wrong_tool_used: [
		{
			title: 'Refine tool planning prompt for this task type',
			description: 'Update tool selection instructions so the agent chooses the correct tool for this task.',
			category: 'tool_planning',
			priority: 'medium',
			proposedChange: {
				promptTemplatePatch: 'Add guidance: for [task type], prefer [correct tool] over [incorrect tool].',
			},
			expectedImpact: 'Improves tool selection accuracy.',
		},
		{
			title: 'Update skill pack to correct tool priority',
			description: 'Adjust skill pack tool ordering so the preferred tool is listed first.',
			category: 'skill_pack',
			priority: 'medium',
			proposedChange: {
				skillPackSuggestion: 'Move preferred tool to index 0 in skill pack toolIds.',
			},
			expectedImpact: 'Guides agent toward preferred tool selection.',
		},
	],
	tool_failed: [
		{
			title: 'Add error handling for failing tool',
			description: 'Improve the tool pipeline to handle the observed failure gracefully.',
			category: 'prompt',
			priority: 'high',
			proposedChange: {
				notes: 'Investigate tool error logs. Add retry logic or fallback handling.',
			},
			expectedImpact: 'Reduces hard failures from tool errors.',
		},
	],
	browser_failed: [
		{
			title: 'Improve Playwright workflow for failing browser task',
			description: 'Review the Playwright workflow template for the observed failure case.',
			category: 'workflow',
			priority: 'high',
			proposedChange: {
				workflowSuggestion: 'Add fallback steps and error capture to the Playwright workflow template.',
			},
			expectedImpact: 'Reduces browser task failures.',
		},
	],
	hallucination: [
		{
			title: 'Add anti-hallucination prompt rule',
			description: 'Explicitly instruct the agent to never invent unavailable context.',
			category: 'prompt',
			priority: 'critical',
			proposedChange: {
				promptTemplatePatch:
					'Add to system prompt: "Never invent information not present in provided context. If you do not know, say: I do not have enough context to answer this."',
			},
			expectedImpact: 'Directly reduces hallucinated responses.',
		},
		{
			title: 'Create evaluation case for hallucination scenario',
			description: 'Add golden test to verify the agent refuses to hallucinate on unknown context.',
			category: 'evaluation_case',
			priority: 'critical',
			proposedChange: {
				newEvaluationCase: 'Input: question that cannot be answered from context. Expected: agent acknowledges lack of context.',
			},
			expectedImpact: 'Prevents regression on hallucination behavior.',
		},
	],
	missing_context: [
		{
			title: 'Add connector or RAG context step to workflow',
			description: 'Ensure relevant domain context is fetched before agent responds.',
			category: 'rag_context',
			priority: 'medium',
			proposedChange: {
				workflowSuggestion: 'Add context-fetch step early in workflow. Wire to relevant connector or RAG knowledge source.',
			},
			expectedImpact: 'Improves agent responses in context-dependent tasks.',
		},
	],
	poor_prompt_understanding: [
		{
			title: 'Add intent clarification workflow step',
			description: 'When intent is ambiguous, have the agent ask a clarifying question before proceeding.',
			category: 'workflow',
			priority: 'medium',
			proposedChange: {
				workflowSuggestion: 'Add optional clarification step triggered on low-confidence intent detection.',
			},
			expectedImpact: 'Reduces misunderstood requests.',
		},
	],
	bad_format: [
		{
			title: 'Improve output format instructions in agent prompt',
			description: 'Tighten the format instructions in the system prompt for this agent.',
			category: 'prompt',
			priority: 'low',
			proposedChange: {
				promptTemplatePatch: 'Add explicit format example to system prompt output section.',
			},
			expectedImpact: 'Improves response structure consistency.',
		},
	],
	slow_response: [
		{
			title: 'Profile and reduce workflow step count for slow tasks',
			description: 'Identify which workflow steps contribute most to latency.',
			category: 'performance',
			priority: 'medium',
			proposedChange: {
				notes: 'Review agent run step durations. Consider parallelising or removing redundant steps.',
			},
			expectedImpact: 'Reduces perceived response time.',
		},
	],
	permission_issue: [
		{
			title: 'Review RBAC permissions for failing user role',
			description: 'Check permission gap for the role that encountered access denied.',
			category: 'safety',
			priority: 'high',
			proposedChange: {
				notes: 'Review role-permission mapping for the affected user role and connector/tool.',
			},
			expectedImpact: 'Eliminates incorrect permission denials for legitimate users.',
		},
	],
	ui_issue: [
		{
			title: 'File frontend bug for UI rendering issue',
			description: 'Review workspace component for the observed rendering problem.',
			category: 'ui',
			priority: 'medium',
			proposedChange: {
				notes: 'File in admin backlog. Reference feedback ID for repro steps.',
			},
			expectedImpact: 'Improves UX reliability.',
		},
	],
	other: [
		{
			title: 'Manually review unclassified feedback',
			description: 'This feedback did not match a known pattern. Requires manual review to classify.',
			category: 'prompt',
			priority: 'low',
			proposedChange: {
				notes: 'Review raw feedback. Re-classify triage with correct category.',
			},
			expectedImpact: 'Ensures no feedback is missed.',
		},
	],
};

@Injectable()
export class AgentImprovementRecommendationService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly triageRepo: FeedbackTriageRepository,
		private readonly backlogRepo: AgentImprovementBacklogRepository,
	) {}

	async generateRecommendations(agentSlug?: string): Promise<Record<string, unknown>[]> {
		const triageItems = await this.triageRepo.list(300, {
			...(agentSlug ? { agentSlug } : {}),
			status: 'triaged' as const,
		});

		const created: Record<string, unknown>[] = [];

		for (const triage of triageItems) {
			const specs = RECOMMENDATION_MAP[triage.category as FeedbackTriageCategory] ?? [];
			for (const spec of specs) {
				const item = await this.backlogRepo.create({
					agentSlug: triage.agentSlug,
					title: spec.title,
					description: spec.description,
					sourceType: 'feedback',
					sourceId: triage.feedbackId,
					priority: spec.priority,
					status: 'new',
					category: spec.category,
					proposedChangeJson: JSON.stringify(spec.proposedChange),
					expectedImpact: spec.expectedImpact,
					metadataJson: JSON.stringify({ triageId: triage.id }),
				});
				created.push(item);
			}

			await this.triageRepo.update(triage.id, { status: 'planned' });
		}

		return created;
	}

	async generateFromTriage(triageId: string): Promise<Record<string, unknown>[]> {
		const triage = await this.triageRepo.findById(triageId);
		if (!triage) return [];

		const specs = RECOMMENDATION_MAP[triage.category as FeedbackTriageCategory] ?? [];
		const created: Record<string, unknown>[] = [];

		for (const spec of specs) {
			const item = await this.backlogRepo.create({
				agentSlug: triage.agentSlug,
				title: spec.title,
				description: spec.description,
				sourceType: 'feedback',
				sourceId: triage.feedbackId,
				priority: spec.priority,
				status: 'new',
				category: spec.category,
				proposedChangeJson: JSON.stringify(spec.proposedChange),
				expectedImpact: spec.expectedImpact,
				metadataJson: JSON.stringify({ triageId: triage.id }),
			});
			created.push(item);
		}

		return created;
	}

	async generateFromFailedRuns(agentSlug: string): Promise<Record<string, unknown>[]> {
		const failedRuns = await this.prisma.agentRun.findMany({
			where: { agentSlug, status: 'failed' },
			orderBy: { createdAt: 'desc' },
			take: 20,
			select: { id: true, error: true, agentSlug: true },
		});

		const created: Record<string, unknown>[] = [];

		for (const run of failedRuns) {
			const item = await this.backlogRepo.create({
				agentSlug: run.agentSlug,
				title: `Investigate failed run: ${run.id.slice(0, 8)}`,
				description: `Agent run failed with error: ${(run.error ?? 'unknown').slice(0, 500)}`,
				sourceType: 'failed_run',
				sourceId: run.id,
				priority: 'high',
				status: 'new',
				category: 'prompt',
				expectedImpact: 'Reduces agent failure rate.',
			});
			created.push(item);
		}

		return created;
	}

	async generateFromEvaluationFailures(agentSlug: string): Promise<Record<string, unknown>[]> {
		const latestRun = await this.prisma.agentEvaluationRun.findFirst({
			where: { agentSlug, status: 'completed' },
			orderBy: { startedAt: 'desc' },
		});

		if (!latestRun) return [];

		const failedCases = await this.prisma.agentEvaluationCaseResult.findMany({
			where: { evaluationRunId: latestRun.id, status: 'failed' },
			take: 20,
			select: { id: true, evaluationCaseId: true, inputPrompt: true, issuesJson: true },
		});

		const created: Record<string, unknown>[] = [];

		for (const fc of failedCases) {
			const item = await this.backlogRepo.create({
				agentSlug,
				title: `Fix evaluation failure: ${fc.inputPrompt.slice(0, 60)}`,
				description: `Evaluation case ${fc.evaluationCaseId} failed. Issues: ${fc.issuesJson ?? 'see evaluation run'}`,
				sourceType: 'evaluation',
				sourceId: fc.evaluationCaseId,
				priority: 'high',
				status: 'new',
				category: 'evaluation_case',
				expectedImpact: 'Improves evaluation pass rate.',
			});
			created.push(item);
		}

		return created;
	}
}
