import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { stringifyJson } from '../../common/utils/json';
import type { BrowserAction } from '../models/browser-action.model';
import { mapBrowserAction } from './browser-mappers';

@Injectable()
export class BrowserActionRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		browserSessionId: string;
		runId: string;
		type: string;
		status: string;
		selector?: string | null;
		value?: string | null;
		url?: string | null;
		result?: Record<string, unknown> | null;
		error?: string | null;
		createdAt: Date;
		startedAt?: Date | null;
		completedAt?: Date | null;
	}): Promise<BrowserAction> {
		const row = await this.prisma.browserAction.create({
			data: {
				id: data.id,
				browserSessionId: data.browserSessionId,
				runId: data.runId,
				type: data.type,
				status: data.status,
				selector: data.selector ?? null,
				value: data.value ?? null,
				url: data.url ?? null,
				resultJson: data.result ? stringifyJson(data.result) : null,
				error: data.error ?? null,
				createdAt: data.createdAt,
				startedAt: data.startedAt ?? null,
				completedAt: data.completedAt ?? null,
			},
		});
		return mapBrowserAction(row);
	}

	async findById(id: string): Promise<BrowserAction | null> {
		const row = await this.prisma.browserAction.findUnique({ where: { id } });
		return row ? mapBrowserAction(row) : null;
	}

	async listByRunId(runId: string): Promise<BrowserAction[]> {
		const rows = await this.prisma.browserAction.findMany({
			where: { runId },
			orderBy: { createdAt: 'asc' },
		});
		return rows.map(mapBrowserAction);
	}

	async listByBrowserSessionId(browserSessionId: string): Promise<BrowserAction[]> {
		const rows = await this.prisma.browserAction.findMany({
			where: { browserSessionId },
			orderBy: { createdAt: 'asc' },
		});
		return rows.map(mapBrowserAction);
	}

	async update(
		id: string,
		patch: Partial<{
			status: string;
			result: Record<string, unknown> | null;
			error: string | null;
			startedAt: Date | null;
			completedAt: Date | null;
		}>,
	): Promise<BrowserAction> {
		const row = await this.prisma.browserAction.update({
			where: { id },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.result !== undefined
					? { resultJson: patch.result ? stringifyJson(patch.result) : null }
					: {}),
				...(patch.error !== undefined ? { error: patch.error } : {}),
				...(patch.startedAt !== undefined ? { startedAt: patch.startedAt } : {}),
				...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
			},
		});
		return mapBrowserAction(row);
	}
}
