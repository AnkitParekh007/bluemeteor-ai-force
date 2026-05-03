import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { newId } from '../../common/utils/ids';

@Injectable()
export class RefreshTokenRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
		await this.prisma.refreshToken.create({
			data: {
				id: newId('rt'),
				userId: data.userId,
				tokenHash: data.tokenHash,
				expiresAt: data.expiresAt,
				createdAt: new Date(),
			},
		});
	}

	revokeById(id: string): Promise<void> {
		return this.revoke(id);
	}

	async findValidByHash(tokenHash: string): Promise<{
		id: string;
		userId: string;
		expiresAt: Date;
		revokedAt: Date | null;
	} | null> {
		const row = await this.prisma.refreshToken.findFirst({
			where: {
				tokenHash,
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
		});
		return row;
	}

	async revoke(id: string): Promise<void> {
		await this.prisma.refreshToken.update({
			where: { id },
			data: { revokedAt: new Date() },
		});
	}

	async revokeAllForUser(userId: string): Promise<void> {
		await this.prisma.refreshToken.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}

	async countActive(): Promise<number> {
		return this.prisma.refreshToken.count({
			where: { revokedAt: null, expiresAt: { gt: new Date() } },
		});
	}
}
