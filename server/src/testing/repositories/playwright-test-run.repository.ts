import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { PlaywrightRunStatus, PlaywrightTestRun } from '../models/playwright-test.model';
import type { PlaywrightTestCase } from '../models/playwright-test.model';

function parseMeta(raw: string | null): Record<string, unknown> | undefined {
	if (!raw) return undefined;
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

function mapCase(row: {
	id: string;
	testRunId: string;
	title: string;
	status: string;
	durationMs: number | null;
	error: string | null;
	screenshotPath: string | null;
	createdAt: Date;
}): PlaywrightTestCase {
	return {
		id: row.id,
		testRunId: row.testRunId,
		title: row.title,
		status: row.status as PlaywrightTestCase['status'],
		durationMs: row.durationMs ?? undefined,
		error: row.error ?? undefined,
		screenshotPath: row.screenshotPath ?? undefined,
		createdAt: row.createdAt.toISOString(),
	};
}

@Injectable()
export class PlaywrightTestRunRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		sessionId: string;
		runId?: string | null;
		agentSlug: string;
		profileId?: string | null;
		status: string;
		total: number;
		passed: number;
		failed: number;
		skipped: number;
		durationMs?: number | null;
		startedAt: Date;
		completedAt?: Date | null;
		error?: string | null;
		resultJson?: string | null;
		reportPath?: string | null;
		tracePath?: string | null;
		videoPath?: string | null;
		screenshotPath?: string | null;
		metadataJson?: string | null;
	}): Promise<PlaywrightTestRun> {
		const row = await this.prisma.playwrightTestRun.create({
			data: {
				id: data.id,
				sessionId: data.sessionId,
				runId: data.runId ?? null,
				agentSlug: data.agentSlug,
				profileId: data.profileId ?? null,
				status: data.status,
				total: data.total,
				passed: data.passed,
				failed: data.failed,
				skipped: data.skipped,
				durationMs: data.durationMs ?? null,
				startedAt: data.startedAt,
				completedAt: data.completedAt ?? null,
				error: data.error ?? null,
				resultJson: data.resultJson ?? null,
				reportPath: data.reportPath ?? null,
				tracePath: data.tracePath ?? null,
				videoPath: data.videoPath ?? null,
				screenshotPath: data.screenshotPath ?? null,
				metadataJson: data.metadataJson ?? null,
			},
			include: { cases: { orderBy: { createdAt: 'asc' } } },
		});
		return this.mapRun(row);
	}

	private mapRun(row: {
		id: string;
		sessionId: string;
		runId: string | null;
		agentSlug: string;
		profileId: string | null;
		status: string;
		total: number;
		passed: number;
		failed: number;
		skipped: number;
		durationMs: number | null;
		startedAt: Date;
		completedAt: Date | null;
		error: string | null;
		resultJson: string | null;
		reportPath: string | null;
		tracePath: string | null;
		videoPath: string | null;
		screenshotPath: string | null;
		metadataJson: string | null;
		cases?: Array<{
			id: string;
			testRunId: string;
			title: string;
			status: string;
			durationMs: number | null;
			error: string | null;
			screenshotPath: string | null;
			createdAt: Date;
		}>;
	}): PlaywrightTestRun {
		return {
			id: row.id,
			sessionId: row.sessionId,
			runId: row.runId ?? undefined,
			agentSlug: row.agentSlug,
			profileId: row.profileId ?? undefined,
			status: row.status as PlaywrightRunStatus,
			total: row.total,
			passed: row.passed,
			failed: row.failed,
			skipped: row.skipped,
			durationMs: row.durationMs ?? undefined,
			startedAt: row.startedAt.toISOString(),
			completedAt: row.completedAt?.toISOString(),
			error: row.error ?? undefined,
			results: (row.cases ?? []).map(mapCase),
			reportPath: row.reportPath ?? undefined,
			tracePath: row.tracePath ?? undefined,
			videoPath: row.videoPath ?? undefined,
			screenshotPath: row.screenshotPath ?? undefined,
			metadata: parseMeta(row.metadataJson),
		};
	}

	async findById(id: string): Promise<PlaywrightTestRun | null> {
		const row = await this.prisma.playwrightTestRun.findUnique({
			where: { id },
			include: { cases: { orderBy: { createdAt: 'asc' } } },
		});
		return row ? this.mapRun(row) : null;
	}

	async listBySessionId(sessionId: string): Promise<PlaywrightTestRun[]> {
		const rows = await this.prisma.playwrightTestRun.findMany({
			where: { sessionId },
			orderBy: { startedAt: 'desc' },
			include: { cases: { orderBy: { createdAt: 'asc' } } },
		});
		return rows.map((r) => this.mapRun(r));
	}

	async update(
		id: string,
		patch: Partial<{
			status: string;
			total: number;
			passed: number;
			failed: number;
			skipped: number;
			durationMs: number | null;
			completedAt: Date | null;
			error: string | null;
			resultJson: string | null;
			reportPath: string | null;
			tracePath: string | null;
			videoPath: string | null;
			screenshotPath: string | null;
			metadataJson: string | null;
		}>,
	): Promise<PlaywrightTestRun> {
		const row = await this.prisma.playwrightTestRun.update({
			where: { id },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.total !== undefined ? { total: patch.total } : {}),
				...(patch.passed !== undefined ? { passed: patch.passed } : {}),
				...(patch.failed !== undefined ? { failed: patch.failed } : {}),
				...(patch.skipped !== undefined ? { skipped: patch.skipped } : {}),
				...(patch.durationMs !== undefined ? { durationMs: patch.durationMs } : {}),
				...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
				...(patch.error !== undefined ? { error: patch.error } : {}),
				...(patch.resultJson !== undefined ? { resultJson: patch.resultJson } : {}),
				...(patch.reportPath !== undefined ? { reportPath: patch.reportPath } : {}),
				...(patch.tracePath !== undefined ? { tracePath: patch.tracePath } : {}),
				...(patch.videoPath !== undefined ? { videoPath: patch.videoPath } : {}),
				...(patch.screenshotPath !== undefined ? { screenshotPath: patch.screenshotPath } : {}),
				...(patch.metadataJson !== undefined ? { metadataJson: patch.metadataJson } : {}),
			},
			include: { cases: { orderBy: { createdAt: 'asc' } } },
		});
		return this.mapRun(row);
	}
}
