import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { PlaywrightSpec, PlaywrightSpecStatus } from '../models/playwright-test.model';

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
	agentSlug: string;
	title: string;
	templateKey: string | null;
	specPath: string | null;
	content: string;
	status: string;
	createdAt: Date;
	updatedAt: Date | null;
	metadataJson: string | null;
}): PlaywrightSpec {
	return {
		id: row.id,
		sessionId: row.sessionId,
		runId: row.runId ?? undefined,
		agentSlug: row.agentSlug,
		title: row.title,
		templateKey: row.templateKey ?? undefined,
		specPath: row.specPath ?? undefined,
		content: row.content,
		status: row.status as PlaywrightSpecStatus,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString(),
		metadata: parseMeta(row.metadataJson),
	};
}

@Injectable()
export class PlaywrightSpecRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		sessionId: string;
		runId?: string | null;
		agentSlug: string;
		title: string;
		templateKey?: string | null;
		specPath?: string | null;
		content: string;
		status: string;
		createdAt: Date;
		metadataJson?: string | null;
	}): Promise<PlaywrightSpec> {
		const row = await this.prisma.playwrightSpec.create({
			data: {
				id: data.id,
				sessionId: data.sessionId,
				runId: data.runId ?? null,
				agentSlug: data.agentSlug,
				title: data.title,
				templateKey: data.templateKey ?? null,
				specPath: data.specPath ?? null,
				content: data.content,
				status: data.status,
				createdAt: data.createdAt,
				metadataJson: data.metadataJson ?? null,
			},
		});
		return mapRow(row);
	}

	async findById(id: string): Promise<PlaywrightSpec | null> {
		const row = await this.prisma.playwrightSpec.findUnique({ where: { id } });
		return row ? mapRow(row) : null;
	}

	async listBySessionId(sessionId: string): Promise<PlaywrightSpec[]> {
		const rows = await this.prisma.playwrightSpec.findMany({
			where: { sessionId },
			orderBy: { createdAt: 'desc' },
		});
		return rows.map(mapRow);
	}

	async update(
		id: string,
		patch: Partial<{
			status: string;
			specPath: string | null;
			updatedAt: Date;
			metadataJson: string | null;
		}>,
	): Promise<PlaywrightSpec> {
		const row = await this.prisma.playwrightSpec.update({
			where: { id },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.specPath !== undefined ? { specPath: patch.specPath } : {}),
				...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
				...(patch.metadataJson !== undefined ? { metadataJson: patch.metadataJson } : {}),
			},
		});
		return mapRow(row);
	}
}
