import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { PlaywrightTestCase } from '../models/playwright-test.model';

@Injectable()
export class PlaywrightTestCaseRepository {
	constructor(private readonly prisma: PrismaService) {}

	async createMany(
		cases: Array<{
			id: string;
			testRunId: string;
			title: string;
			status: string;
			durationMs?: number | null;
			error?: string | null;
			screenshotPath?: string | null;
			createdAt: Date;
		}>,
	): Promise<void> {
		if (cases.length === 0) return;
		await this.prisma.playwrightTestCase.createMany({ data: cases });
	}

	async listByRunId(testRunId: string): Promise<PlaywrightTestCase[]> {
		const rows = await this.prisma.playwrightTestCase.findMany({
			where: { testRunId },
			orderBy: { createdAt: 'asc' },
		});
		return rows.map((row) => ({
			id: row.id,
			testRunId: row.testRunId,
			title: row.title,
			status: row.status as PlaywrightTestCase['status'],
			durationMs: row.durationMs ?? undefined,
			error: row.error ?? undefined,
			screenshotPath: row.screenshotPath ?? undefined,
			createdAt: row.createdAt.toISOString(),
		}));
	}
}
