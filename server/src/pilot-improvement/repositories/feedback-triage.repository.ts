import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import type {
	FeedbackTriageCategory,
	FeedbackSeverity,
	FeedbackTriageStatus,
} from '../models/feedback-triage.model';

export type FeedbackTriageFilters = {
	readonly agentSlug?: string;
	readonly category?: FeedbackTriageCategory;
	readonly severity?: FeedbackSeverity;
	readonly status?: FeedbackTriageStatus;
	readonly from?: Date;
	readonly to?: Date;
};

@Injectable()
export class FeedbackTriageRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findByFeedbackId(feedbackId: string) {
		return this.prisma.pilotFeedbackTriage.findFirst({ where: { feedbackId } });
	}

	async findById(id: string) {
		return this.prisma.pilotFeedbackTriage.findUnique({ where: { id } });
	}

	async create(data: {
		feedbackId: string;
		agentSlug: string;
		category: string;
		severity: string;
		status: string;
		summary: string;
		rootCause?: string;
		recommendedAction?: string;
		assignedToUserId?: string;
		metadataJson?: string;
	}) {
		const now = new Date();
		return this.prisma.pilotFeedbackTriage.create({
			data: {
				id: randomUUID(),
				...data,
				createdAt: now,
				updatedAt: now,
			},
		});
	}

	async update(
		id: string,
		data: {
			category?: string;
			severity?: string;
			status?: string;
			summary?: string;
			rootCause?: string;
			recommendedAction?: string;
			assignedToUserId?: string;
			resolvedAt?: Date | null;
			metadataJson?: string;
		},
	) {
		return this.prisma.pilotFeedbackTriage.update({
			where: { id },
			data: { ...data, updatedAt: new Date() },
		});
	}

	async list(take = 200, filters?: FeedbackTriageFilters) {
		const where: Record<string, unknown> = {};
		if (filters?.agentSlug) where['agentSlug'] = filters.agentSlug;
		if (filters?.category) where['category'] = filters.category;
		if (filters?.severity) where['severity'] = filters.severity;
		if (filters?.status) where['status'] = filters.status;
		if (filters?.from || filters?.to) {
			const createdAt: Record<string, Date> = {};
			if (filters.from) createdAt['gte'] = filters.from;
			if (filters.to) createdAt['lte'] = filters.to;
			where['createdAt'] = createdAt;
		}
		return this.prisma.pilotFeedbackTriage.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			take: Math.min(500, Math.max(1, take)),
		});
	}

	async countByStatus() {
		return this.prisma.pilotFeedbackTriage.groupBy({
			by: ['status'],
			_count: { _all: true },
		});
	}

	async countBySeverity() {
		return this.prisma.pilotFeedbackTriage.groupBy({
			by: ['severity'],
			_count: { _all: true },
		});
	}

	async countByCategory() {
		return this.prisma.pilotFeedbackTriage.groupBy({
			by: ['category'],
			_count: { _all: true },
		});
	}
}
