import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { TriageFeedbackDto } from '../dto/triage-feedback.dto';
import type { FeedbackTriageCategory, FeedbackSeverity, FeedbackTriageStatus } from '../models/feedback-triage.model';
import { FeedbackTriageRepository, type FeedbackTriageFilters } from '../repositories/feedback-triage.repository';
import { FeedbackClassifierService } from './feedback-classifier.service';

@Injectable()
export class FeedbackTriageService {
	constructor(
		private readonly repo: FeedbackTriageRepository,
		private readonly classifier: FeedbackClassifierService,
		private readonly prisma: PrismaService,
	) {}

	async listTriage(filters?: FeedbackTriageFilters) {
		return this.repo.list(200, filters);
	}

	async getTriageById(id: string) {
		const item = await this.repo.findById(id);
		if (!item) throw new NotFoundException(`Triage record ${id} not found`);
		return item;
	}

	async triageFeedback(feedbackId: string): Promise<Record<string, unknown>> {
		const feedback = await this.prisma.pilotFeedback.findUnique({ where: { id: feedbackId } });
		if (!feedback) throw new NotFoundException(`Feedback ${feedbackId} not found`);

		const existing = await this.repo.findByFeedbackId(feedbackId);

		const result = this.classifier.classify({
			rating: feedback.rating,
			whatFailed: feedback.whatFailed,
			whatWorked: feedback.whatWorked,
			taskType: feedback.taskType,
		});

		if (existing) {
			return this.repo.update(existing.id, {
				category: result.category,
				severity: result.severity,
				status: 'triaged',
				summary: result.summary,
				rootCause: result.rootCause,
				recommendedAction: result.recommendedAction,
			});
		}

		return this.repo.create({
			feedbackId,
			agentSlug: feedback.agentSlug,
			category: result.category,
			severity: result.severity,
			status: 'triaged',
			summary: result.summary,
			rootCause: result.rootCause,
			recommendedAction: result.recommendedAction,
		});
	}

	async runTriageBatch(): Promise<{ triaged: number; skipped: number }> {
		const allFeedback = await this.prisma.pilotFeedback.findMany({
			orderBy: { createdAt: 'desc' },
			take: 500,
			select: { id: true },
		});

		let triaged = 0;
		let skipped = 0;

		for (const f of allFeedback) {
			const existing = await this.repo.findByFeedbackId(f.id);
			if (existing && existing.status !== 'new') {
				skipped++;
				continue;
			}
			try {
				await this.triageFeedback(f.id);
				triaged++;
			} catch {
				skipped++;
			}
		}

		return { triaged, skipped };
	}

	async updateTriage(id: string, dto: TriageFeedbackDto): Promise<Record<string, unknown>> {
		const existing = await this.repo.findById(id);
		if (!existing) throw new NotFoundException(`Triage record ${id} not found`);

		const resolvedAt =
			dto.status === 'resolved' && !existing.resolvedAt ? new Date() :
			dto.status && dto.status !== 'resolved' ? null :
			undefined;

		return this.repo.update(id, {
			category: dto.category as FeedbackTriageCategory | undefined,
			severity: dto.severity as FeedbackSeverity | undefined,
			status: dto.status as FeedbackTriageStatus | undefined,
			summary: dto.summary,
			rootCause: dto.rootCause,
			recommendedAction: dto.recommendedAction,
			assignedToUserId: dto.assignedToUserId,
			...(resolvedAt !== undefined ? { resolvedAt } : {}),
		});
	}

	async getTriageStats() {
		const [byStatus, bySeverity, byCategory] = await Promise.all([
			this.repo.countByStatus(),
			this.repo.countBySeverity(),
			this.repo.countByCategory(),
		]);
		return { byStatus, bySeverity, byCategory };
	}
}
