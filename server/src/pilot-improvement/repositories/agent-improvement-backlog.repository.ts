import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import type {
	ImprovementCategory,
	ImprovementPriority,
	ImprovementStatus,
} from '../models/agent-improvement-backlog.model';

export type BacklogFilters = {
	readonly agentSlug?: string;
	readonly category?: ImprovementCategory;
	readonly priority?: ImprovementPriority;
	readonly status?: ImprovementStatus;
};

@Injectable()
export class AgentImprovementBacklogRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		return this.prisma.agentImprovementBacklog.findUnique({ where: { id } });
	}

	async create(data: {
		agentSlug: string;
		title: string;
		description: string;
		sourceType: string;
		sourceId?: string;
		priority: string;
		status: string;
		category: string;
		proposedChangeJson?: string;
		expectedImpact?: string;
		metadataJson?: string;
	}) {
		const now = new Date();
		return this.prisma.agentImprovementBacklog.create({
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
			title?: string;
			description?: string;
			priority?: string;
			status?: string;
			category?: string;
			proposedChangeJson?: string;
			expectedImpact?: string;
			completedAt?: Date | null;
			metadataJson?: string;
		},
	) {
		return this.prisma.agentImprovementBacklog.update({
			where: { id },
			data: { ...data, updatedAt: new Date() },
		});
	}

	async list(take = 200, filters?: BacklogFilters) {
		const where: Record<string, unknown> = {};
		if (filters?.agentSlug) where['agentSlug'] = filters.agentSlug;
		if (filters?.category) where['category'] = filters.category;
		if (filters?.priority) where['priority'] = filters.priority;
		if (filters?.status) where['status'] = filters.status;
		return this.prisma.agentImprovementBacklog.findMany({
			where,
			orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
			take: Math.min(500, Math.max(1, take)),
		});
	}

	async countByStatus() {
		return this.prisma.agentImprovementBacklog.groupBy({
			by: ['status'],
			_count: { _all: true },
		});
	}

	async countByCategory() {
		return this.prisma.agentImprovementBacklog.groupBy({
			by: ['category'],
			_count: { _all: true },
		});
	}

	async countOpenHighPriority() {
		return this.prisma.agentImprovementBacklog.count({
			where: {
				status: { in: ['new', 'accepted', 'in_progress'] },
				priority: { in: ['critical', 'high'] },
			},
		});
	}
}
