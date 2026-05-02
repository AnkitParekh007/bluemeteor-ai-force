import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { newId } from '../../common/utils/ids';

@Injectable()
export class UserRepository {
	constructor(private readonly prisma: PrismaService) {}

	findByEmail(email: string) {
		return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
	}

	findById(id: string) {
		return this.prisma.user.findUnique({ where: { id } });
	}

	async listAll(): Promise<
		Array<{
			id: string;
			email: string;
			name: string;
			status: string;
			department: string | null;
			createdAt: Date;
		}>
	> {
		return this.prisma.user.findMany({
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				email: true,
				name: true,
				status: true,
				department: true,
				createdAt: true,
			},
		});
	}

	async create(data: {
		email: string;
		name: string;
		passwordHash: string;
		status: string;
		department?: string;
		jobTitle?: string;
	}): Promise<{ id: string }> {
		const id = newId('usr');
		const now = new Date();
		await this.prisma.user.create({
			data: {
				id,
				email: data.email.toLowerCase(),
				name: data.name,
				passwordHash: data.passwordHash,
				status: data.status,
				department: data.department ?? null,
				jobTitle: data.jobTitle ?? null,
				createdAt: now,
				updatedAt: now,
			},
		});
		return { id };
	}

	async update(
		id: string,
		patch: Partial<{ name: string; department: string | null; jobTitle: string | null; status: string }>,
	): Promise<void> {
		await this.prisma.user.update({
			where: { id },
			data: { ...patch, updatedAt: new Date() },
		});
	}

	async setLastLogin(id: string): Promise<void> {
		await this.prisma.user.update({
			where: { id },
			data: { lastLoginAt: new Date(), updatedAt: new Date() },
		});
	}

	touchLastLogin(id: string): Promise<void> {
		return this.setLastLogin(id);
	}

	async listWithRoles(): Promise<
		Array<{
			id: string;
			email: string;
			name: string;
			status: string;
			department: string | null;
			jobTitle: string | null;
			createdAt: Date;
			userRoles: Array<{ role: { key: string; name: string } }>;
		}>
	> {
		return this.prisma.user.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				userRoles: { include: { role: { select: { key: true, name: true } } } },
			},
		});
	}

	async count(): Promise<number> {
		return this.prisma.user.count();
	}
}
