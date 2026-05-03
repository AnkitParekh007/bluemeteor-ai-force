import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { AgentSession } from '../models/agent-session.model';
import type { AgentWorkspaceMode } from '../models/agent-session.model';
import { mapSession } from './mappers';

@Injectable()
export class AgentSessionRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(params: {
		id: string;
		agentSlug: string;
		title: string;
		mode: AgentWorkspaceMode;
		status: string;
		createdAt: Date;
		updatedAt: Date;
		preview?: string;
	}): Promise<AgentSession> {
		const row = await this.prisma.agentSession.create({
			data: {
				id: params.id,
				agentSlug: params.agentSlug,
				title: params.title,
				mode: params.mode,
				status: params.status,
				createdAt: params.createdAt,
				updatedAt: params.updatedAt,
				messageCount: 0,
				preview: params.preview ?? null,
			},
		});
		return mapSession(row);
	}

	async findById(id: string): Promise<AgentSession | null> {
		const row = await this.prisma.agentSession.findUnique({ where: { id } });
		return row ? mapSession(row) : null;
	}

	async listByAgentSlug(agentSlug: string): Promise<AgentSession[]> {
		const rows = await this.prisma.agentSession.findMany({
			where: { agentSlug },
			orderBy: { updatedAt: 'desc' },
		});
		return rows.map(mapSession);
	}

	async update(
		id: string,
		patch: Partial<{ title: string; mode: string; status: string; preview: string | null; updatedAt: Date }>,
	): Promise<AgentSession> {
		const row = await this.prisma.agentSession.update({
			where: { id },
			data: {
				...(patch.title !== undefined ? { title: patch.title } : {}),
				...(patch.mode !== undefined ? { mode: patch.mode } : {}),
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.preview !== undefined ? { preview: patch.preview } : {}),
				...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
			},
		});
		return mapSession(row);
	}

	async incrementMessageCount(id: string, updatedAt: Date): Promise<void> {
		await this.prisma.agentSession.update({
			where: { id },
			data: {
				messageCount: { increment: 1 },
				updatedAt,
			},
		});
	}

	async count(): Promise<number> {
		return this.prisma.agentSession.count();
	}
}
