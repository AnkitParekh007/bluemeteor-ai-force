import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class McpToolCallRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(row: {
		id: string;
		serverId: string;
		toolName: string;
		runId: string | null;
		sessionId: string | null;
		agentSlug: string | null;
		inputJson: string | null;
	}): Promise<void> {
		await this.prisma.mcpToolCall.create({
			data: {
				id: row.id,
				serverId: row.serverId,
				toolName: row.toolName,
				runId: row.runId,
				sessionId: row.sessionId,
				agentSlug: row.agentSlug,
				inputJson: row.inputJson,
				isError: false,
				createdAt: new Date(),
			},
		});
	}

	async complete(
		id: string,
		patch: { outputJson: string | null; isError: boolean; error: string | null; completedAt: Date },
	): Promise<void> {
		await this.prisma.mcpToolCall.update({
			where: { id },
			data: patch,
		});
	}
}
