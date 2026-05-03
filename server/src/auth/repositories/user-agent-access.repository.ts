import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { newId } from '../../common/utils/ids';

@Injectable()
export class UserAgentAccessRepository {
	constructor(private readonly prisma: PrismaService) {}

	async upsert(userId: string, agentSlug: string, accessLevel: string): Promise<void> {
		const now = new Date();
		await this.prisma.userAgentAccess.upsert({
			where: { userId_agentSlug: { userId, agentSlug } },
			create: {
				id: newId('uaa'),
				userId,
				agentSlug,
				accessLevel,
				createdAt: now,
				updatedAt: now,
			},
			update: { accessLevel, updatedAt: now },
		});
	}

	async listForUser(userId: string): Promise<Array<{ agentSlug: string; accessLevel: string }>> {
		const rows = await this.prisma.userAgentAccess.findMany({ where: { userId } });
		return rows.map((r) => ({ agentSlug: r.agentSlug, accessLevel: r.accessLevel }));
	}
}
