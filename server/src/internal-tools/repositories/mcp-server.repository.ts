import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class McpServerRepository {
	constructor(private readonly prisma: PrismaService) {}

	async upsertFromConfig(row: {
		id: string;
		name: string;
		description: string | null;
		transport: string;
		enabled: boolean;
		status: string;
		riskLevel: string;
		readOnly: boolean;
		configJson: string | null;
	}): Promise<void> {
		const now = new Date();
		await this.prisma.mcpServer.upsert({
			where: { id: row.id },
			create: {
				id: row.id,
				name: row.name,
				description: row.description,
				transport: row.transport,
				enabled: row.enabled,
				status: row.status,
				riskLevel: row.riskLevel,
				readOnly: row.readOnly,
				configJson: row.configJson,
				createdAt: now,
				updatedAt: now,
			},
			update: {
				name: row.name,
				description: row.description,
				transport: row.transport,
				enabled: row.enabled,
				riskLevel: row.riskLevel,
				readOnly: row.readOnly,
				configJson: row.configJson,
				updatedAt: now,
			},
		});
	}

	async updateStatus(
		id: string,
		patch: { status?: string; error?: string | null; startedAt?: Date | null; stoppedAt?: Date | null },
	): Promise<void> {
		try {
			await this.prisma.mcpServer.update({
				where: { id },
				data: { ...patch, updatedAt: new Date() },
			});
		} catch {
			/* row may not exist yet */
		}
	}

	async listAll(): Promise<
		Array<{
			id: string;
			name: string;
			description: string | null;
			transport: string;
			enabled: boolean;
			status: string;
			riskLevel: string;
			readOnly: boolean;
		}>
	> {
		return this.prisma.mcpServer.findMany({
			orderBy: { id: 'asc' },
			select: {
				id: true,
				name: true,
				description: true,
				transport: true,
				enabled: true,
				status: true,
				riskLevel: true,
				readOnly: true,
			},
		});
	}
}
