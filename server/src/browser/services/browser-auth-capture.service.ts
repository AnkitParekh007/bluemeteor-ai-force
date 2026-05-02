import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Page } from 'playwright';

import { newId } from '../../common/utils/ids';
import { AppConfigService } from '../../config/app-config.service';
import type { BrowserAuthCapture, BrowserProfile } from '../models/browser-profile.model';
import type { BrowserSession } from '../models/browser-session.model';
import { BrowserAuthCaptureRepository } from '../repositories/browser-auth-capture.repository';
import { BrowserProfileService } from './browser-profile.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserWorkerService } from './browser-worker.service';

@Injectable()
export class BrowserAuthCaptureService {
	private readonly log = new Logger(BrowserAuthCaptureService.name);

	constructor(
		private readonly cfg: AppConfigService,
		private readonly profiles: BrowserProfileService,
		private readonly captures: BrowserAuthCaptureRepository,
		private readonly sessions: BrowserSessionService,
		private readonly worker: BrowserWorkerService,
	) {}

	async startAuthCapture(input: {
		agentSessionId: string;
		runId?: string;
		agentSlug: string;
		profileId?: string;
		profileName?: string;
		loginUrl?: string;
		createdByUserId?: string;
	}): Promise<{ capture: BrowserAuthCapture; browserSession: BrowserSession }> {
		if (!this.cfg.enableAuthenticatedBrowserSessions) {
			throw new BadRequestException('Authenticated browser sessions are disabled.');
		}
		this.cfg.assertTestTargetAllowsExecution();
		const loginUrl = (input.loginUrl ?? this.cfg.testTargetLoginUrl).trim();
		this.worker.assertUrlAllowed(loginUrl);

		let profile: BrowserProfile;
		if (input.profileId) {
			profile = await this.profiles.getProfile(input.profileId);
		} else {
			profile = await this.profiles.createProfile({
				name: input.profileName ?? `Capture ${new Date().toISOString().slice(0, 16)}`,
				createdByUserId: input.createdByUserId,
			});
		}

		await this.profiles.updateStatus(profile.id, 'capturing');

		const capture = await this.captures.create({
			id: newId('bauth'),
			sessionId: input.agentSessionId,
			runId: input.runId ?? null,
			profileId: profile.id,
			status: 'waiting_for_login',
			loginUrl,
			startedAt: new Date(),
			metadataJson: JSON.stringify({ phase: 'opened' }),
		});

		const browserSession = await this.sessions.getOrCreateActiveSession(
			input.agentSessionId,
			input.runId ?? 'capture',
			input.agentSlug,
		);
		await this.worker.ensureBrowserSession(browserSession);
		await this.worker.attachProfileStorageState(browserSession.id, null);
		await this.worker.openUrl(browserSession.id, loginUrl, input.runId ?? 'capture');

		const meta = { ...(capture.metadata ?? {}), browserSessionId: browserSession.id };
		await this.captures.update(capture.id, {
			metadataJson: JSON.stringify(meta),
		});
		const updated = await this.captures.findById(capture.id);
		if (!updated) throw new Error('capture missing');
		return { capture: updated, browserSession };
	}

	async completeAuthCapture(captureId: string): Promise<BrowserProfile> {
		const cap = await this.captures.findById(captureId);
		if (!cap) throw new NotFoundException('Capture not found');
		if (cap.status !== 'waiting_for_login' && cap.status !== 'started') {
			throw new BadRequestException('Capture is not waiting for login');
		}
		const profileId = cap.profileId;
		if (!profileId) throw new BadRequestException('Capture has no profile');
		const browserSessionId = cap.metadata?.['browserSessionId'];
		if (typeof browserSessionId !== 'string') {
			throw new BadRequestException('Capture missing browserSessionId metadata');
		}
		try {
			const state = await this.worker.exportStorageState(browserSessionId);
			const profile = await this.profiles.saveStorageState(profileId, state);
			await this.captures.update(captureId, {
				status: 'completed',
				completedAt: new Date(),
				metadataJson: JSON.stringify({ ...(cap.metadata ?? {}), saved: true }),
			});
			return profile;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			await this.captures.update(captureId, { status: 'failed', error: msg, completedAt: new Date() });
			await this.profiles.markFailed(profileId);
			throw e;
		}
	}

	async cancelAuthCapture(captureId: string): Promise<void> {
		const cap = await this.captures.findById(captureId);
		if (!cap) throw new NotFoundException('Capture not found');
		await this.captures.update(captureId, { status: 'cancelled', completedAt: new Date() });
		const browserSessionId = cap.metadata?.['browserSessionId'];
		if (typeof browserSessionId === 'string') {
			try {
				await this.worker.close(browserSessionId);
			} catch {
				/* ignore */
			}
		}
	}

	async getCapture(captureId: string): Promise<BrowserAuthCapture> {
		const c = await this.captures.findById(captureId);
		if (!c) throw new NotFoundException('Capture not found');
		return c;
	}

	/** Local-only demo automation — never uses demo credentials against non-local targets. */
	async runDemoLoginAndSaveProfile(input: {
		agentSessionId: string;
		runId: string;
		agentSlug: string;
		profileName?: string;
		forceApproved: boolean;
	}): Promise<BrowserProfile> {
		if (!this.cfg.isDemoBrowserLoginTargetSafe()) {
			throw new BadRequestException('Demo browser login is not allowed for this target/environment.');
		}
		if (!this.cfg.enableAuthenticatedBrowserSessions) {
			throw new BadRequestException('Authenticated browser sessions are disabled.');
		}
		if (!this.worker.allowsMutation(input.forceApproved)) {
			throw new BadRequestException('Demo login requires tool approval or ENABLE_REAL_BROWSER_ACTIONS=true.');
		}
		const profile = await this.profiles.createProfile({
			name: input.profileName ?? `Demo profile ${new Date().toISOString().slice(0, 16)}`,
		});
		await this.profiles.updateStatus(profile.id, 'capturing');
		const bs = await this.sessions.getOrCreateActiveSession(input.agentSessionId, input.runId, input.agentSlug);
		await this.worker.ensureBrowserSession(bs);
		await this.worker.attachProfileStorageState(bs.id, null);
		await this.worker.openUrl(bs.id, this.cfg.testTargetLoginUrl, input.runId);
		const page = await this.worker.getOrOpenPage(bs.id);
		await this.fillDemoLogin(page);
		await new Promise((r) => setTimeout(r, 1500));
		const state = await this.worker.exportStorageState(bs.id);
		const saved = await this.profiles.saveStorageState(profile.id, state);
		this.log.log(`Demo auth profile ready: ${profile.id}`);
		return saved;
	}

	private async fillDemoLogin(page: Page): Promise<void> {
		const user = this.cfg.demoBrowserUsername;
		const pass = this.cfg.demoBrowserPassword;
		const email = page.locator('#email').or(page.locator('input[type="email"]')).first();
		const password = page.locator('#password-field').or(page.locator('input[type="password"]')).first();
		const submit = page.getByRole('button', { name: /enter your ai workspace/i });
		await email.waitFor({ state: 'visible', timeout: this.cfg.browserActionTimeoutMs });
		await password.waitFor({ state: 'visible', timeout: this.cfg.browserActionTimeoutMs });
		await email.fill(user);
		await password.fill(pass);
		if ((await submit.count()) > 0) await submit.click();
		else await page.keyboard.press('Enter');
	}
}
