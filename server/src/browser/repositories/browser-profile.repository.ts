import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { BrowserProfile, BrowserProfileStatus } from '../models/browser-profile.model';

function parseMeta(raw: string | null): Record<string, unknown> | undefined {
	if (!raw) return undefined;
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

function mapRow(row: {
	id: string;
	name: string;
	description: string | null;
	targetBaseUrl: string;
	environment: string;
	status: string;
	storageStatePath: string | null;
	createdByUserId: string | null;
	createdAt: Date;
	updatedAt: Date;
	lastUsedAt: Date | null;
	expiresAt: Date | null;
	metadataJson: string | null;
}): BrowserProfile {
	return {
		id: row.id,
		name: row.name,
		description: row.description ?? undefined,
		targetBaseUrl: row.targetBaseUrl,
		environment: row.environment,
		status: row.status as BrowserProfileStatus,
		storageStatePath: row.storageStatePath ?? undefined,
		createdByUserId: row.createdByUserId ?? undefined,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		lastUsedAt: row.lastUsedAt?.toISOString(),
		expiresAt: row.expiresAt?.toISOString(),
		metadata: parseMeta(row.metadataJson),
	};
}

@Injectable()
export class BrowserProfileRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		name: string;
		description?: string | null;
		targetBaseUrl: string;
		environment: string;
		status: string;
		storageStatePath?: string | null;
		createdByUserId?: string | null;
		createdAt: Date;
		updatedAt: Date;
		metadataJson?: string | null;
	}): Promise<BrowserProfile> {
		const row = await this.prisma.browserProfile.create({
			data: {
				id: data.id,
				name: data.name,
				description: data.description ?? null,
				targetBaseUrl: data.targetBaseUrl,
				environment: data.environment,
				status: data.status,
				storageStatePath: data.storageStatePath ?? null,
				createdByUserId: data.createdByUserId ?? null,
				createdAt: data.createdAt,
				updatedAt: data.updatedAt,
				metadataJson: data.metadataJson ?? null,
			},
		});
		return mapRow(row);
	}

	async findById(id: string): Promise<BrowserProfile | null> {
		const row = await this.prisma.browserProfile.findUnique({ where: { id } });
		return row ? mapRow(row) : null;
	}

	async listAll(): Promise<BrowserProfile[]> {
		const rows = await this.prisma.browserProfile.findMany({ orderBy: { updatedAt: 'desc' } });
		return rows.map(mapRow);
	}

	async update(
		id: string,
		patch: Partial<{
			status: string;
			storageStatePath: string | null;
			updatedAt: Date;
			lastUsedAt: Date | null;
			expiresAt: Date | null;
			metadataJson: string | null;
		}>,
	): Promise<BrowserProfile> {
		const row = await this.prisma.browserProfile.update({
			where: { id },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.storageStatePath !== undefined ? { storageStatePath: patch.storageStatePath } : {}),
				...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
				...(patch.lastUsedAt !== undefined ? { lastUsedAt: patch.lastUsedAt } : {}),
				...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
				...(patch.metadataJson !== undefined ? { metadataJson: patch.metadataJson } : {}),
			},
		});
		return mapRow(row);
	}

	async delete(id: string): Promise<void> {
		await this.prisma.browserProfile.delete({ where: { id } });
	}
}
