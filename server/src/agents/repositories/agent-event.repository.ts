import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { stringifyJson } from '../../common/utils/json';
import type { AgentRuntimeEvent } from '../models/agent-runtime-event.model';
import { mapRuntimeEvent } from './mappers';

@Injectable()
export class AgentEventRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(e: AgentRuntimeEvent): Promise<AgentRuntimeEvent> {
		const row = await this.prisma.agentRuntimeEvent.create({
			data: {
				id: e.id,
				runId: e.runId ?? null,
				sessionId: e.sessionId,
				agentSlug: e.agentSlug,
				type: e.type,
				title: e.title,
				message: e.message ?? null,
				timestamp: new Date(e.timestamp),
				payloadJson: stringifyJson(e.payload),
			},
		});
		return mapRuntimeEvent(row);
	}

	async listBySessionId(sessionId: string): Promise<AgentRuntimeEvent[]> {
		const rows = await this.prisma.agentRuntimeEvent.findMany({
			where: { sessionId },
			orderBy: { timestamp: 'asc' },
		});
		return rows.map(mapRuntimeEvent);
	}

	async listByRunId(runId: string): Promise<AgentRuntimeEvent[]> {
		const rows = await this.prisma.agentRuntimeEvent.findMany({
			where: { runId },
			orderBy: { timestamp: 'asc' },
		});
		return rows.map(mapRuntimeEvent);
	}

	async count(): Promise<number> {
		return this.prisma.agentRuntimeEvent.count();
	}
}
