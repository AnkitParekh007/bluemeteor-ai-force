import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { BrowserAuthCapture, BrowserAuthCaptureStatus } from '../models/browser-profile.model';

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
	sessionId: string;
	runId: string | null;
	profileId: string | null;
	status: string;
	loginUrl: string;
	startedAt: Date;
	completedAt: Date | null;
	error: string | null;
	metadataJson: string | null;
}): BrowserAuthCapture {
	return {
		id: row.id,
		sessionId: row.sessionId,
		runId: row.runId ?? undefined,
		profileId: row.profileId ?? undefined,
		status: row.status as BrowserAuthCaptureStatus,
		loginUrl: row.loginUrl,
		startedAt: row.startedAt.toISOString(),
		completedAt: row.completedAt?.toISOString(),
		error: row.error ?? undefined,
		metadata: parseMeta(row.metadataJson),
	};
}

@Injectable()
export class BrowserAuthCaptureRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		sessionId: string;
		runId?: string | null;
		profileId?: string | null;
		status: string;
		loginUrl: string;
		startedAt: Date;
		metadataJson?: string | null;
	}): Promise<BrowserAuthCapture> {
		const row = await this.prisma.browserAuthCapture.create({
			data: {
				id: data.id,
				sessionId: data.sessionId,
				runId: data.runId ?? null,
				profileId: data.profileId ?? null,
				status: data.status,
				loginUrl: data.loginUrl,
				startedAt: data.startedAt,
				metadataJson: data.metadataJson ?? null,
			},
		});
		return mapRow(row);
	}

	async findById(id: string): Promise<BrowserAuthCapture | null> {
		const row = await this.prisma.browserAuthCapture.findUnique({ where: { id } });
		return row ? mapRow(row) : null;
	}

	async update(
		id: string,
		patch: Partial<{
			status: string;
			completedAt: Date | null;
			error: string | null;
			metadataJson: string | null;
		}>,
	): Promise<BrowserAuthCapture> {
		const row = await this.prisma.browserAuthCapture.update({
			where: { id },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
				...(patch.error !== undefined ? { error: patch.error } : {}),
				...(patch.metadataJson !== undefined ? { metadataJson: patch.metadataJson } : {}),
			},
		});
		return mapRow(row);
	}
}
