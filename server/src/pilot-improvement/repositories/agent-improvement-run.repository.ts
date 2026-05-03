import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AgentImprovementRunRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		agentSlug: string;
		title: string;
		status: string;
		baselineScore?: number;
		newScore?: number;
		changesAppliedJson?: string;
		evaluationRunId?: string;
		metadataJson?: string;
	}) {
		return this.prisma.agentImprovementRun.create({
			data: {
				id: randomUUID(),
				...data,
				createdAt: new Date(),
			},
		});
	}

	async update(
		id: string,
		data: {
			status?: string;
			baselineScore?: number;
			newScore?: number;
			changesAppliedJson?: string;
			evaluationRunId?: string;
			completedAt?: Date;
			metadataJson?: string;
		},
	) {
		return this.prisma.agentImprovementRun.update({ where: { id }, data });
	}

	async listByAgent(agentSlug: string, take = 20) {
		return this.prisma.agentImprovementRun.findMany({
			where: { agentSlug },
			orderBy: { createdAt: 'desc' },
			take,
		});
	}

	async latestTwoForAgent(agentSlug: string) {
		return this.prisma.agentImprovementRun.findMany({
			where: { agentSlug, status: 'completed' },
			orderBy: { createdAt: 'desc' },
			take: 2,
		});
	}
}
