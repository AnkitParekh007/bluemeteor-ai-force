import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import { AgentEvaluationService } from '../../agent-intelligence/services/agent-evaluation.service';
import { AgentImprovementBacklogRepository } from '../repositories/agent-improvement-backlog.repository';
import { FeedbackTriageRepository } from '../repositories/feedback-triage.repository';

@Injectable()
export class EvaluationCaseGeneratorService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly evaluationService: AgentEvaluationService,
		private readonly triageRepo: FeedbackTriageRepository,
		private readonly backlogRepo: AgentImprovementBacklogRepository,
	) {}

	async createFromFeedback(feedbackId: string): Promise<Record<string, unknown>> {
		const feedback = await this.prisma.pilotFeedback.findUnique({ where: { id: feedbackId } });
		if (!feedback) throw new NotFoundException(`Feedback ${feedbackId} not found`);

		const triage = await this.triageRepo.findByFeedbackId(feedbackId);

		const expectedBehaviors: string[] = this.buildExpectedBehaviors(
			feedback.whatFailed,
			feedback.taskType,
			triage?.category,
		);

		const expectedArtifacts: string[] = this.inferExpectedArtifacts(
			triage?.category,
			feedback.whatFailed,
		);

		const key = `feedback_${feedbackId.slice(0, 8)}_${Date.now()}`;
		const name = `From feedback: ${feedback.taskType.slice(0, 60)}`;
		const priority = this.derivePriority(feedback.rating, triage?.severity);

		const evalCase = await this.evaluationService.createCase({
			agentSlug: feedback.agentSlug,
			key,
			name,
			description: `Auto-generated from pilot feedback. Original failure: ${feedback.whatFailed.slice(0, 200)}`,
			inputPrompt: feedback.taskType,
			expectedBehaviors,
			expectedArtifacts,
			expectedTools: [],
			category: 'regression',
			priority,
			status: 'active',
			metadata: {
				sourceFeedbackId: feedbackId,
				sourceTriageId: triage?.id,
				sourceRating: feedback.rating,
				generatedAt: new Date().toISOString(),
			},
		});

		return evalCase as unknown as Record<string, unknown>;
	}

	async createFromBacklogItem(backlogItemId: string): Promise<Record<string, unknown>> {
		const item = await this.backlogRepo.findById(backlogItemId);
		if (!item) throw new NotFoundException(`Backlog item ${backlogItemId} not found`);

		let proposedChange: {
			newEvaluationCase?: string;
			promptTemplatePatch?: string;
			notes?: string;
		} = {};
		try {
			proposedChange = item.proposedChangeJson ? JSON.parse(item.proposedChangeJson) : {};
		} catch {
			proposedChange = {};
		}

		const key = `backlog_${backlogItemId.slice(0, 8)}_${Date.now()}`;
		const name = `From backlog: ${item.title.slice(0, 60)}`;

		const evalCase = await this.evaluationService.createCase({
			agentSlug: item.agentSlug,
			key,
			name,
			description: `Auto-generated from improvement backlog item. ${item.description.slice(0, 200)}`,
			inputPrompt: proposedChange.newEvaluationCase ?? item.title,
			expectedBehaviors: [item.expectedImpact ?? 'Agent should handle this scenario correctly.'],
			expectedArtifacts: [],
			expectedTools: [],
			category: 'regression',
			priority: item.priority as 'critical' | 'high' | 'medium' | 'low',
			status: 'active',
			metadata: {
				sourceBacklogItemId: backlogItemId,
				generatedAt: new Date().toISOString(),
			},
		});

		return evalCase as unknown as Record<string, unknown>;
	}

	private buildExpectedBehaviors(
		whatFailed: string,
		taskType: string,
		triageCategory?: string | null,
	): string[] {
		const behaviors: string[] = [
			`Agent should successfully handle: ${taskType.slice(0, 100)}`,
			`Agent should not repeat the failure: ${whatFailed.slice(0, 150)}`,
		];

		if (triageCategory === 'hallucination') {
			behaviors.push('Agent must not invent information not in context.');
			behaviors.push('Agent should state "I do not have enough context" when applicable.');
		}
		if (triageCategory === 'missing_artifact') {
			behaviors.push('Agent response must include expected artifact(s).');
		}
		if (triageCategory === 'wrong_answer') {
			behaviors.push('Agent answer must be factually accurate and grounded.');
		}
		if (triageCategory === 'incomplete_answer') {
			behaviors.push('Agent response must be complete with all required sections.');
		}

		return behaviors;
	}

	private inferExpectedArtifacts(
		triageCategory?: string | null,
		whatFailed?: string,
	): string[] {
		if (triageCategory === 'missing_artifact') {
			if (/playwright|spec|test/i.test(whatFailed ?? '')) return ['test/playwright_spec'];
			if (/code|script/i.test(whatFailed ?? '')) return ['code'];
			if (/doc|documentation/i.test(whatFailed ?? '')) return ['document'];
			return ['artifact'];
		}
		return [];
	}

	private derivePriority(rating: number, severity?: string | null): 'critical' | 'high' | 'medium' | 'low' {
		if (severity === 'critical' || rating === 1) return 'critical';
		if (severity === 'high' || rating === 2) return 'high';
		if (rating === 3) return 'medium';
		return 'low';
	}
}
