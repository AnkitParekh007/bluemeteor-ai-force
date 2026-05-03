import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { newId } from '../../common/utils/ids';

@Injectable()
export class RoleRepository {
	constructor(private readonly prisma: PrismaService) {}

	findByKey(key: string) {
		return this.prisma.role.findUnique({ where: { key } });
	}

	async upsertRole(data: { key: string; name: string; description?: string }): Promise<{ id: string }> {
		const now = new Date();
		const row = await this.prisma.role.upsert({
			where: { key: data.key },
			create: {
				id: newId('role'),
				key: data.key,
				name: data.name,
				description: data.description ?? null,
				createdAt: now,
				updatedAt: now,
			},
			update: { name: data.name, description: data.description ?? null, updatedAt: now },
		});
		return { id: row.id };
	}

	async assignRole(userId: string, roleId: string): Promise<void> {
		await this.prisma.userRole.upsert({
			where: { userId_roleId: { userId, roleId } },
			create: { id: newId('ur'), userId, roleId, createdAt: new Date() },
			update: {},
		});
	}

	async listRolesForUser(userId: string): Promise<string[]> {
		const rows = await this.prisma.userRole.findMany({
			where: { userId },
			include: { role: true },
		});
		return rows.map((r) => r.role.key);
	}

	async listAll(): Promise<Array<{ id: string; key: string; name: string; description: string | null }>> {
		return this.prisma.role.findMany({ orderBy: { key: 'asc' } });
	}

	async count(): Promise<number> {
		return this.prisma.role.count();
	}
}
