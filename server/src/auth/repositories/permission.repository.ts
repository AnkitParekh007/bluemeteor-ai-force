import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { newId } from '../../common/utils/ids';

@Injectable()
export class PermissionRepository {
	constructor(private readonly prisma: PrismaService) {}

	async upsertPermission(data: {
		key: string;
		name: string;
		category: string;
		description?: string;
	}): Promise<{ id: string }> {
		const now = new Date();
		const row = await this.prisma.permission.upsert({
			where: { key: data.key },
			create: {
				id: newId('perm'),
				key: data.key,
				name: data.name,
				category: data.category,
				description: data.description ?? null,
				createdAt: now,
				updatedAt: now,
			},
			update: {
				name: data.name,
				category: data.category,
				description: data.description ?? null,
				updatedAt: now,
			},
		});
		return { id: row.id };
	}

	async linkRolePermission(roleId: string, permissionId: string): Promise<void> {
		await this.prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: { roleId, permissionId },
			},
			create: {
				id: newId('rp'),
				roleId,
				permissionId,
				createdAt: new Date(),
			},
			update: {},
		});
	}

	async findIdsByKeys(keys: string[]): Promise<Map<string, string>> {
		const rows = await this.prisma.permission.findMany({
			where: { key: { in: keys } },
			select: { id: true, key: true },
		});
		return new Map(rows.map((r) => [r.key, r.id]));
	}

	async listAll(): Promise<Array<{ id: string; key: string; name: string; category: string; description: string | null }>> {
		return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
	}

	async count(): Promise<number> {
		return this.prisma.permission.count();
	}

	async permissionsForUser(userId: string): Promise<string[]> {
		const rows = await this.prisma.userRole.findMany({
			where: { userId },
			include: {
				role: {
					include: {
						rolePermissions: { include: { permission: true } },
					},
				},
			},
		});
		const set = new Set<string>();
		for (const ur of rows) {
			for (const rp of ur.role.rolePermissions) {
				set.add(rp.permission.key);
			}
		}
		return [...set];
	}
}
