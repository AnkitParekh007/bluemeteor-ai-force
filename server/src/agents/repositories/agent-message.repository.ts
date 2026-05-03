import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { stringifyJson } from '../../common/utils/json';
import type { AgentMessage } from '../models/agent-message.model';
import { mapMessage } from './mappers';

@Injectable()
export class AgentMessageRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(msg: AgentMessage): Promise<AgentMessage> {
		const row = await this.prisma.agentMessage.create({
			data: {
				id: msg.id,
				sessionId: msg.sessionId,
				role: msg.role,
				content: msg.content,
				status: msg.status ?? 'done',
				createdAt: new Date(msg.createdAt),
				metadataJson: stringifyJson(msg.metadata ?? undefined),
			},
		});
		return mapMessage(row);
	}

	async listBySessionId(sessionId: string): Promise<AgentMessage[]> {
		const rows = await this.prisma.agentMessage.findMany({
			where: { sessionId },
			orderBy: { createdAt: 'asc' },
		});
		return rows.map(mapMessage);
	}
}
