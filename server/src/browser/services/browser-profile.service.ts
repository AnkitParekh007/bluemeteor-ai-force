import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { newId } from '../../common/utils/ids';
import { AppConfigService } from '../../config/app-config.service';
import type { BrowserProfile, BrowserProfileStatus } from '../models/browser-profile.model';
import { BrowserProfileRepository } from '../repositories/browser-profile.repository';

export interface PublicBrowserProfile extends Omit<BrowserProfile, 'storageStatePath'> {}

@Injectable()
export class BrowserProfileService {
	private readonly log = new Logger(BrowserProfileService.name);

	constructor(
		private readonly cfg: AppConfigService,
		private readonly repo: BrowserProfileRepository,
	) {}

	toPublic(p: BrowserProfile): PublicBrowserProfile {
		const { storageStatePath: _s, ...rest } = p;
		return rest;
	}

	private sanitizeProfileName(name: string): string {
		const n = name.trim();
		if (!n) throw new BadRequestException('Profile name required');
		if (/[/\\]/.test(n) || n.includes('..')) throw new BadRequestException('Invalid profile name');
		return n.slice(0, 120);
	}

	assertTargetAllowedForProfile(targetBaseUrl: string): void {
		this.cfg.assertTestTargetAllowsExecution();
		let parsed: URL;
		try {
			parsed = new URL(targetBaseUrl);
		} catch {
			throw new BadRequestException('Invalid targetBaseUrl');
		}
		const allowed = this.cfg.testTargetAllowedOrigins.some((o) => {
			try {
				return parsed.origin === new URL(o).origin;
			} catch {
				return false;
			}
		});
		if (!allowed) {
			throw new BadRequestException(
				`Target origin ${parsed.origin} is not in TEST_TARGET_ALLOWED_ORIGINS / allowlist.`,
			);
		}
	}

	private authStateFilePath(profileId: string): string {
		const dir = path.join(process.cwd(), this.cfg.browserAuthStateDir);
		const safeId = profileId.replace(/[^a-zA-Z0-9_-]/g, '');
		return path.join(dir, `${safeId}.json`);
	}

	async createProfile(input: {
		name: string;
		description?: string;
		targetBaseUrl?: string;
		environment?: string;
		createdByUserId?: string;
	}): Promise<BrowserProfile> {
		if (!this.cfg.enableAuthenticatedBrowserSessions) {
			throw new BadRequestException('Authenticated browser profiles are disabled (ENABLE_AUTHENTICATED_BROWSER_SESSIONS=false).');
		}
		const targetBaseUrl = (input.targetBaseUrl ?? this.cfg.testTargetBaseUrl).trim();
		this.assertTargetAllowedForProfile(targetBaseUrl);
		const name = this.sanitizeProfileName(input.name);
		const environment = (input.environment ?? this.cfg.testTargetEnvironment).trim().toLowerCase();
		const id = newId('bprof');
		const dir = path.join(process.cwd(), this.cfg.browserAuthStateDir);
		await fs.mkdir(dir, { recursive: true });
		const storageStatePath = this.authStateFilePath(id);
		const now = new Date();
		return this.repo.create({
			id,
			name,
			description: input.description ?? null,
			targetBaseUrl,
			environment,
			status: 'auth_required',
			storageStatePath,
			createdByUserId: input.createdByUserId ?? null,
			createdAt: now,
			updatedAt: now,
		});
	}

	async listProfiles(): Promise<PublicBrowserProfile[]> {
		const rows = await this.repo.listAll();
		return rows.map((p) => this.toPublic(p));
	}

	async getProfile(profileId: string): Promise<BrowserProfile> {
		const p = await this.repo.findById(profileId);
		if (!p) throw new NotFoundException('Browser profile not found');
		return p;
	}

	async markAuthRequired(profileId: string): Promise<void> {
		await this.repo.update(profileId, { status: 'auth_required', updatedAt: new Date() });
	}

	async saveStorageState(profileId: string, storageState: unknown): Promise<BrowserProfile> {
		const p = await this.getProfile(profileId);
		if (!p.storageStatePath) throw new BadRequestException('Profile has no storage path');
		const dir = path.dirname(p.storageStatePath);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(p.storageStatePath, JSON.stringify(storageState), 'utf8');
		this.log.log(`Saved browser storage state for profile ${profileId} (path redacted)`);
		return this.repo.update(profileId, { status: 'ready', updatedAt: new Date(), lastUsedAt: new Date() });
	}

	async getStorageStatePath(profileId: string): Promise<string | null> {
		const p = await this.getProfile(profileId);
		return p.storageStatePath ?? null;
	}

	async markReady(profileId: string): Promise<void> {
		await this.repo.update(profileId, { status: 'ready', updatedAt: new Date(), lastUsedAt: new Date() });
	}

	async markExpired(profileId: string): Promise<void> {
		await this.repo.update(profileId, { status: 'expired', updatedAt: new Date() });
	}

	async markFailed(profileId: string): Promise<void> {
		await this.repo.update(profileId, { status: 'failed', updatedAt: new Date() });
	}

	async deleteProfile(profileId: string): Promise<void> {
		const p = await this.getProfile(profileId);
		if (p.storageStatePath) {
			try {
				await fs.unlink(p.storageStatePath);
			} catch {
				/* ignore */
			}
		}
		await this.repo.delete(profileId);
	}

	async expireOldProfiles(maxAgeDays = 30): Promise<number> {
		const rows = await this.repo.listAll();
		const cutoff = Date.now() - maxAgeDays * 86_400_000;
		let n = 0;
		for (const p of rows) {
			const t = new Date(p.updatedAt).getTime();
			if (t < cutoff && p.status === 'ready') {
				await this.markExpired(p.id);
				n++;
			}
		}
		return n;
	}

	touchLastUsed(profileId: string): Promise<BrowserProfile> {
		return this.repo.update(profileId, { lastUsedAt: new Date(), updatedAt: new Date() });
	}

	updateStatus(profileId: string, status: BrowserProfileStatus): Promise<BrowserProfile> {
		return this.repo.update(profileId, { status, updatedAt: new Date() });
	}
}
