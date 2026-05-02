import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { newId } from '../../common/utils/ids';
import type { BrowserSession } from '../models/browser-session.model';
import { BrowserSessionRepository } from '../repositories/browser-session.repository';

@Injectable()
export class BrowserSessionService {
	constructor(
		private readonly repo: BrowserSessionRepository,
		private readonly config: AppConfigService,
	) {}

	async createBrowserSession(input: {
		sessionId: string;
		runId?: string;
		agentSlug: string;
		headless?: boolean;
	}): Promise<BrowserSession> {
		const now = new Date();
		const expires = new Date(now.getTime() + this.config.browserSessionTimeoutMs);
		return this.repo.create({
			id: newId('brsess'),
			sessionId: input.sessionId,
			runId: input.runId ?? null,
			agentSlug: input.agentSlug,
			status: 'created',
			headless: input.headless ?? this.config.browserHeadless,
			createdAt: now,
			updatedAt: now,
			expiresAt: expires,
		});
	}

	async getBrowserSession(id: string): Promise<BrowserSession | null> {
		return this.repo.findById(id);
	}

	async getOrCreateActiveSession(
		sessionId: string,
		runId: string | undefined,
		agentSlug: string,
	): Promise<BrowserSession> {
		const existing = await this.repo.findActiveBySessionId(sessionId);
		if (existing) return existing;
		return this.createBrowserSession({ sessionId, runId, agentSlug });
	}

	async listBrowserSessions(sessionId: string): Promise<BrowserSession[]> {
		return this.repo.listBySessionId(sessionId);
	}

	async markOpen(browserSessionId: string, url: string, title: string): Promise<BrowserSession> {
		return this.repo.update(browserSessionId, {
			url,
			title,
			status: 'open',
			updatedAt: new Date(),
			error: null,
		});
	}

	async markFailed(browserSessionId: string, error: string): Promise<BrowserSession> {
		return this.repo.update(browserSessionId, {
			status: 'failed',
			updatedAt: new Date(),
			error,
		});
	}

	async closeBrowserSession(browserSessionId: string): Promise<BrowserSession> {
		return this.repo.close(browserSessionId);
	}

	/** Legacy mock helper — persists a lightweight session row for demos when worker is off. */
	async createMockBrowserSession(sessionId: string, runId: string, url: string): Promise<BrowserSession> {
		const now = new Date();
		const s = await this.repo.create({
			id: newId('brsess'),
			sessionId,
			runId,
			agentSlug: 'mock',
			url,
			title: 'Bluemeteor AI Force (local)',
			status: 'open',
			headless: true,
			createdAt: now,
			updatedAt: now,
		});
		return s;
	}
}
