import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { BrowserSession } from '../models/browser-session.model';
import { mapBrowserSession } from './browser-mappers';

@Injectable()
export class BrowserSessionRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		sessionId: string;
		runId?: string | null;
		agentSlug: string;
		url?: string | null;
		title?: string | null;
		status: string;
		headless: boolean;
		createdAt: Date;
		updatedAt: Date;
		expiresAt?: Date | null;
		error?: string | null;
	}): Promise<BrowserSession> {
		const row = await this.prisma.browserSession.create({ data: {
			id: data.id,
			sessionId: data.sessionId,
			runId: data.runId ?? null,
			agentSlug: data.agentSlug,
			url: data.url ?? null,
			title: data.title ?? null,
			status: data.status,
			headless: data.headless,
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
			expiresAt: data.expiresAt ?? null,
			error: data.error ?? null,
		} });
		return mapBrowserSession(row);
	}

	async findById(id: string): Promise<BrowserSession | null> {
		const row = await this.prisma.browserSession.findUnique({ where: { id } });
		return row ? mapBrowserSession(row) : null;
	}

	async findActiveBySessionId(sessionId: string): Promise<BrowserSession | null> {
		const row = await this.prisma.browserSession.findFirst({
			where: {
				sessionId,
				status: { in: ['created', 'opening', 'open'] },
			},
			orderBy: { updatedAt: 'desc' },
		});
		return row ? mapBrowserSession(row) : null;
	}

	async listBySessionId(sessionId: string): Promise<BrowserSession[]> {
		const rows = await this.prisma.browserSession.findMany({
			where: { sessionId },
			orderBy: { createdAt: 'desc' },
		});
		return rows.map(mapBrowserSession);
	}

	async update(
		id: string,
		patch: Partial<{
			url: string | null;
			title: string | null;
			status: string;
			updatedAt: Date;
			expiresAt: Date | null;
			error: string | null;
		}>,
	): Promise<BrowserSession> {
		const row = await this.prisma.browserSession.update({
			where: { id },
			data: {
				...(patch.url !== undefined ? { url: patch.url } : {}),
				...(patch.title !== undefined ? { title: patch.title } : {}),
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
				...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
				...(patch.error !== undefined ? { error: patch.error } : {}),
			},
		});
		return mapBrowserSession(row);
	}

	async close(id: string): Promise<BrowserSession> {
		return this.update(id, { status: 'closed', updatedAt: new Date() });
	}
}
