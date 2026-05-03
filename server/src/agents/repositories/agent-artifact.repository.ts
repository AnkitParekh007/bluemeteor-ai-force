import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { stringifyJson } from '../../common/utils/json';
import type { AgentArtifact } from '../models/agent-artifact.model';
import { mapArtifact } from './mappers';

@Injectable()
export class AgentArtifactRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(a: AgentArtifact): Promise<AgentArtifact> {
		const row = await this.prisma.agentArtifact.create({
			data: {
				id: a.id,
				sessionId: a.sessionId,
				runId: a.runId ?? null,
				agentSlug: a.agentSlug,
				type: a.type,
				title: a.title,
				description: a.description ?? null,
				content: a.content,
				language: a.language ?? null,
				createdAt: new Date(a.createdAt),
				updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(a.createdAt),
				metadataJson: stringifyJson(a.metadata),
			},
		});
		return mapArtifact(row);
	}

	async listBySessionId(sessionId: string): Promise<AgentArtifact[]> {
		const rows = await this.prisma.agentArtifact.findMany({
			where: { sessionId },
			orderBy: { createdAt: 'asc' },
		});
		return rows.map(mapArtifact);
	}

	async listByRunId(runId: string): Promise<AgentArtifact[]> {
		const rows = await this.prisma.agentArtifact.findMany({
			where: { runId },
			orderBy: { createdAt: 'asc' },
		});
		return rows.map(mapArtifact);
	}

	async findById(id: string): Promise<AgentArtifact | null> {
		const row = await this.prisma.agentArtifact.findUnique({ where: { id } });
		return row ? mapArtifact(row) : null;
	}

	async count(): Promise<number> {
		return this.prisma.agentArtifact.count();
	}
}
