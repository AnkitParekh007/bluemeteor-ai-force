import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class McpToolRepository {
	constructor(private readonly prisma: PrismaService) {}

	async replaceServerTools(
		serverId: string,
		tools: Array<{
			name: string;
			description: string | null;
			inputSchemaJson: string | null;
			riskLevel: string;
			readOnly: boolean;
			enabled: boolean;
		}>,
	): Promise<void> {
		const now = new Date();
		await this.prisma.mcpTool.deleteMany({ where: { serverId } });
		if (!tools.length) return;
		await this.prisma.mcpTool.createMany({
			data: tools.map((t) => ({
				id: `${serverId}::${t.name}`,
				serverId,
				name: t.name,
				description: t.description,
				inputSchemaJson: t.inputSchemaJson,
				riskLevel: t.riskLevel,
				readOnly: t.readOnly,
				enabled: t.enabled,
				createdAt: now,
				updatedAt: now,
			})),
		});
	}

	async listByServer(serverId: string) {
		return this.prisma.mcpTool.findMany({ where: { serverId }, orderBy: { name: 'asc' } });
	}

	async listAll() {
		return this.prisma.mcpTool.findMany({ orderBy: [{ serverId: 'asc' }, { name: 'asc' }] });
	}
}
