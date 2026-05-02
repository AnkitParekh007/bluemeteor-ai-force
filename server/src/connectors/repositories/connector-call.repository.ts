import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConnectorCallRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		connectorId: string;
		provider: string;
		operation: string;
		inputJson?: string | null;
		outputSummary?: string | null;
		status: string;
		error?: string | null;
		createdAt: Date;
		completedAt?: Date | null;
	}): Promise<void> {
		await this.prisma.connectorCall.create({ data });
	}

	async update(
		id: string,
		patch: { outputSummary?: string | null; status?: string; error?: string | null; completedAt?: Date | null },
	): Promise<void> {
		await this.prisma.connectorCall.update({ where: { id }, data: patch });
	}

	async listRecent(limit = 50): Promise<
		Array<{
			id: string;
			connectorId: string;
			provider: string;
			operation: string;
			status: string;
			createdAt: Date;
		}>
	> {
		return this.prisma.connectorCall.findMany({
			orderBy: { createdAt: 'desc' },
			take: limit,
			select: {
				id: true,
				connectorId: true,
				provider: true,
				operation: true,
				status: true,
				createdAt: true,
			},
		});
	}

	async listByConnector(connectorId: string, limit = 30): Promise<
		Array<{
			id: string;
			operation: string;
			status: string;
			createdAt: Date;
		}>
	> {
		return this.prisma.connectorCall.findMany({
			where: { connectorId },
			orderBy: { createdAt: 'desc' },
			take: limit,
			select: { id: true, operation: true, status: true, createdAt: true },
		});
	}
}
