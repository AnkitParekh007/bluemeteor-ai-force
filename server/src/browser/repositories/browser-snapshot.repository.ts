import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { BrowserSnapshot } from '../models/browser-snapshot.model';
import { mapBrowserSnapshot } from './browser-mappers';

@Injectable()
export class BrowserSnapshotRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		browserSessionId: string;
		runId?: string | null;
		url?: string | null;
		title?: string | null;
		screenshotPath?: string | null;
		screenshotUrl?: string | null;
		domSummary?: string | null;
		textContent?: string | null;
		createdAt: Date;
	}): Promise<BrowserSnapshot> {
		const row = await this.prisma.browserSnapshot.create({
			data: {
				id: data.id,
				browserSessionId: data.browserSessionId,
				runId: data.runId ?? null,
				url: data.url ?? null,
				title: data.title ?? null,
				screenshotPath: data.screenshotPath ?? null,
				screenshotUrl: data.screenshotUrl ?? null,
				domSummary: data.domSummary ?? null,
				textContent: data.textContent ?? null,
				createdAt: data.createdAt,
			},
		});
		return mapBrowserSnapshot(row);
	}

	async findById(id: string): Promise<BrowserSnapshot | null> {
		const row = await this.prisma.browserSnapshot.findUnique({ where: { id } });
		return row ? mapBrowserSnapshot(row) : null;
	}

	async listByBrowserSessionId(browserSessionId: string): Promise<BrowserSnapshot[]> {
		const rows = await this.prisma.browserSnapshot.findMany({
			where: { browserSessionId },
			orderBy: { createdAt: 'desc' },
		});
		return rows.map(mapBrowserSnapshot);
	}

	async listByRunId(runId: string): Promise<BrowserSnapshot[]> {
		const rows = await this.prisma.browserSnapshot.findMany({
			where: { runId },
			orderBy: { createdAt: 'desc' },
		});
		return rows.map(mapBrowserSnapshot);
	}
}
