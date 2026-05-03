import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../database/prisma.service';

export type PilotFeedbackListFilters = {
	readonly agentSlug?: string;
	readonly userRole?: string;
	readonly minRating?: number;
	readonly maxRating?: number;
	readonly from?: Date;
	readonly to?: Date;
};

@Injectable()
export class PilotFeedbackRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		readonly userId: string | null;
		readonly userEmail: string | null;
		readonly userRole: string;
		readonly agentSlug: string;
		readonly rating: number;
		readonly taskType: string;
		readonly whatWorked: string;
		readonly whatFailed: string;
		readonly timeSavedMinutes: number | null;
		readonly wouldUseAgain: boolean;
		readonly notes: string | null;
		readonly sessionId: string | null;
		readonly runId: string | null;
		readonly traceId: string | null;
	}): Promise<{ id: string }> {
		const id = randomUUID();
		await this.prisma.pilotFeedback.create({
			data: {
				id,
				userId: data.userId,
				userEmail: data.userEmail,
				userRole: data.userRole,
				agentSlug: data.agentSlug,
				rating: data.rating,
				taskType: data.taskType,
				whatWorked: data.whatWorked,
				whatFailed: data.whatFailed,
				timeSavedMinutes: data.timeSavedMinutes,
				wouldUseAgain: data.wouldUseAgain,
				notes: data.notes,
				sessionId: data.sessionId,
				runId: data.runId,
				traceId: data.traceId,
				createdAt: new Date(),
			},
		});
		return { id };
	}

	async list(take: number, filters?: PilotFeedbackListFilters) {
		const where: {
			agentSlug?: string;
			userRole?: string;
			rating?: { gte?: number; lte?: number };
			createdAt?: { gte?: Date; lte?: Date };
		} = {};
		if (filters?.agentSlug) where.agentSlug = filters.agentSlug;
		if (filters?.userRole) where.userRole = filters.userRole;
		if (filters?.minRating != null || filters?.maxRating != null) {
			where.rating = {};
			if (filters.minRating != null) where.rating.gte = filters.minRating;
			if (filters.maxRating != null) where.rating.lte = filters.maxRating;
		}
		if (filters?.from || filters?.to) {
			where.createdAt = {};
			if (filters.from) where.createdAt.gte = filters.from;
			if (filters.to) where.createdAt.lte = filters.to;
		}
		return this.prisma.pilotFeedback.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			take: Math.min(500, Math.max(1, take)),
			select: {
				id: true,
				userId: true,
				userEmail: true,
				userRole: true,
				agentSlug: true,
				rating: true,
				taskType: true,
				whatWorked: true,
				whatFailed: true,
				timeSavedMinutes: true,
				wouldUseAgain: true,
				notes: true,
				sessionId: true,
				runId: true,
				traceId: true,
				createdAt: true,
			},
		});
	}

}
