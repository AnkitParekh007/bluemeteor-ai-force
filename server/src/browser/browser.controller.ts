import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { BrowserActionDto } from './dto/browser-action.dto';
import { BrowserSnapshotRepository } from './repositories/browser-snapshot.repository';
import { BrowserAuthCaptureService } from './services/browser-auth-capture.service';
import { BrowserProfileService } from './services/browser-profile.service';
import { BrowserSessionService } from './services/browser-session.service';
import { BrowserWorkerService } from './services/browser-worker.service';

@Controller('browser')
export class BrowserController {
	constructor(
		private readonly sessions: BrowserSessionService,
		private readonly worker: BrowserWorkerService,
		private readonly snapshots: BrowserSnapshotRepository,
		private readonly profiles: BrowserProfileService,
		private readonly authCapture: BrowserAuthCaptureService,
	) {}

	@Get('profiles')
	@RequirePermissions('browser.view')
	listProfiles() {
		return this.profiles.listProfiles();
	}

	@Post('profiles')
	@RequirePermissions('browser.open')
	createProfile(
		@Body()
		body: { name: string; description?: string; targetBaseUrl?: string; environment?: string },
	) {
		return this.profiles.createProfile(body);
	}

	@Get('profiles/:profileId')
	@RequirePermissions('browser.view')
	async getProfilePublic(@Param('profileId') profileId: string) {
		const p = await this.profiles.getProfile(profileId);
		return this.profiles.toPublic(p);
	}

	@Delete('profiles/:profileId')
	@RequirePermissions('browser.open')
	deleteProfile(@Param('profileId') profileId: string) {
		return this.profiles.deleteProfile(profileId).then(() => ({ ok: true }));
	}

	@Post('auth-captures/start')
	@RequirePermissions('browser.open')
	startAuthCapture(
		@Body()
		body: {
			sessionId: string;
			runId?: string;
			agentSlug: string;
			profileId?: string;
			profileName?: string;
			loginUrl?: string;
		},
	) {
		return this.authCapture.startAuthCapture({
			agentSessionId: body.sessionId,
			runId: body.runId,
			agentSlug: body.agentSlug,
			profileId: body.profileId,
			profileName: body.profileName,
			loginUrl: body.loginUrl,
		});
	}

	@Post('auth-captures/:captureId/complete')
	@RequirePermissions('browser.open')
	completeAuthCapture(@Param('captureId') captureId: string) {
		return this.authCapture.completeAuthCapture(captureId);
	}

	@Post('auth-captures/:captureId/cancel')
	@RequirePermissions('browser.open')
	cancelAuthCapture(@Param('captureId') captureId: string) {
		return this.authCapture.cancelAuthCapture(captureId).then(() => ({ ok: true }));
	}

	@Get('auth-captures/:captureId')
	@RequirePermissions('browser.view')
	getCapture(@Param('captureId') captureId: string) {
		return this.authCapture.getCapture(captureId);
	}

	@Get('sessions/:sessionId')
	@RequirePermissions('browser.view')
	async listForAgentSession(@Param('sessionId') sessionId: string) {
		return this.sessions.listBrowserSessions(sessionId);
	}

	@Get('sessions/:browserSessionId/snapshots')
	@RequirePermissions('browser.view')
	async listSnapshots(@Param('browserSessionId') browserSessionId: string) {
		return this.snapshots.listByBrowserSessionId(browserSessionId);
	}

	@Post('sessions/:browserSessionId/actions')
	@Throttle({ browser: { limit: 20, ttl: 60_000 } })
	@RequirePermissions('browser.open')
	async runAction(
		@Param('browserSessionId') browserSessionId: string,
		@Body() dto: BrowserActionDto,
	) {
		switch (dto.type) {
			case 'open_url':
				return {
					action: { type: dto.type, runId: dto.runId },
					snapshot: await this.worker.openUrl(browserSessionId, dto.url ?? '', dto.runId),
				};
			case 'click':
				return {
					action: { type: dto.type },
					snapshot: await this.worker.click(browserSessionId, dto.selector ?? '', dto.runId, true),
				};
			case 'fill':
				return {
					action: { type: dto.type },
					snapshot: await this.worker.fill(
						browserSessionId,
						dto.selector ?? '',
						dto.value ?? '',
						dto.runId,
						true,
					),
				};
			case 'press':
				return {
					action: { type: dto.type },
					snapshot: await this.worker.press(
						browserSessionId,
						dto.selector ?? '',
						dto.key ?? 'Enter',
						dto.runId,
						true,
					),
				};
			case 'screenshot':
				return {
					action: { type: dto.type },
					snapshot: await this.worker.takeScreenshot(browserSessionId, dto.runId),
				};
			case 'inspect_dom':
				return {
					action: { type: dto.type },
					snapshot: await this.worker.inspectDom(browserSessionId, dto.runId),
				};
			case 'extract_text':
				return {
					action: { type: dto.type },
					snapshot: await this.worker.extractText(browserSessionId, dto.runId),
				};
			case 'close':
				await this.worker.close(browserSessionId);
				return { action: { type: dto.type }, snapshot: null };
			default:
				return {
					action: { type: dto.type },
					snapshot: await this.worker.waitForSelector(browserSessionId, dto.selector ?? '', dto.runId),
				};
		}
	}

	@Post('sessions/:browserSessionId/close')
	@RequirePermissions('browser.open')
	async close(@Param('browserSessionId') browserSessionId: string) {
		await this.worker.close(browserSessionId);
		return { ok: true };
	}
}
