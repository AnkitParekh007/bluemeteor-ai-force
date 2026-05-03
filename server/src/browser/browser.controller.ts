import {
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	NotFoundException,
	Param,
	Post,
	UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AppConfigService } from '../config/app-config.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
	RequireBrowserSessionAccess,
	RequireSessionAccess,
} from '../auth/decorators/require-session-access.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { SessionAccessGuard } from '../auth/guards/session-access.guard';
import type { AuthUser } from '../auth/models/auth-user.model';
import type { ToolExecutionResult } from '../tools/models/tool-execution.model';
import { ToolExecutorService } from '../tools/services/tool-executor.service';
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
		private readonly toolExecutor: ToolExecutorService,
		private readonly cfg: AppConfigService,
	) {}

	private unwrapBrowserAction(
		dto: BrowserActionDto,
		res: ToolExecutionResult,
	): Record<string, unknown> {
		if (res.status === 'requires_approval') {
			return {
				action: { type: dto.type, runId: dto.runId },
				snapshot: null,
				approvalId: res.approvalId,
				executionId: res.executionId,
				status: res.status,
			};
		}
		if (res.status !== 'completed') {
			return {
				action: { type: dto.type, runId: dto.runId },
				snapshot: null,
				error: res.error ?? res.status,
				status: res.status,
			};
		}
		const out = res.output ?? {};
		const snap = typeof out['snapshot'] === 'object' && out['snapshot'] !== null ? out['snapshot'] : null;
		return {
			action: { type: dto.type, runId: dto.runId },
			snapshot: snap,
			status: res.status,
		};
	}

	private assertDirectBrowserDebug(user: AuthUser): void {
		if (!this.cfg.enableDirectBrowserDebugEndpoints) {
			throw new ForbiddenException(
				'Direct browser debug endpoints are disabled. Use agent tool execution or enable ENABLE_DIRECT_BROWSER_DEBUG_ENDPOINTS for trusted break-glass use.',
			);
		}
		const ok =
			user.permissions.includes('system.admin') ||
			user.permissions.includes('system.debug.view') ||
			user.permissions.includes('tools.manage');
		if (!ok) {
			throw new ForbiddenException('Direct browser debug requires system.debug.view, tools.manage, or system.admin');
		}
	}

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
	@Throttle({ browser: { limit: 10, ttl: 60_000 } })
	@UseGuards(SessionAccessGuard)
	@RequireSessionAccess('use', 'sessionId', 'body')
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
	@Throttle({ browser: { limit: 15, ttl: 60_000 } })
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
	@UseGuards(SessionAccessGuard)
	@RequireSessionAccess('view')
	@RequirePermissions('browser.view')
	async listForAgentSession(@Param('sessionId') sessionId: string) {
		return this.sessions.listBrowserSessions(sessionId);
	}

	@Get('sessions/:browserSessionId/snapshots')
	@UseGuards(SessionAccessGuard)
	@RequireBrowserSessionAccess('view')
	@RequirePermissions('browser.view')
	async listSnapshots(@Param('browserSessionId') browserSessionId: string) {
		return this.snapshots.listByBrowserSessionId(browserSessionId);
	}

	@Post('sessions/:browserSessionId/actions')
	@Throttle({ browser: { limit: 15, ttl: 60_000 } })
	@UseGuards(SessionAccessGuard)
	@RequireBrowserSessionAccess('use')
	@RequirePermissions('browser.open')
	async runAction(
		@CurrentUser() user: AuthUser,
		@Param('browserSessionId') browserSessionId: string,
		@Body() dto: BrowserActionDto,
	) {
		const bs = await this.sessions.getBrowserSession(browserSessionId);
		if (!bs) throw new NotFoundException('Browser session not found');

		const mutationTypes = new Set(['open_url', 'click', 'fill', 'press', 'close']);
		if (mutationTypes.has(dto.type)) {
			this.assertDirectBrowserDebug(user);
			switch (dto.type) {
				case 'open_url':
					return this.unwrapBrowserAction(
						dto,
						await this.toolExecutor.execute({
							runId: dto.runId,
							sessionId: bs.sessionId,
							agentSlug: bs.agentSlug,
							mode: 'act',
							toolId: 'browser_open_url',
							input: { url: dto.url ?? '' },
							actorUserId: user.id,
							targetBrowserSessionId: browserSessionId,
						}),
					);
				case 'click':
					return this.unwrapBrowserAction(
						dto,
						await this.toolExecutor.execute({
							runId: dto.runId,
							sessionId: bs.sessionId,
							agentSlug: bs.agentSlug,
							mode: 'act',
							toolId: 'browser_click',
							input: { selector: dto.selector ?? '' },
							actorUserId: user.id,
							targetBrowserSessionId: browserSessionId,
						}),
					);
				case 'fill':
					return this.unwrapBrowserAction(
						dto,
						await this.toolExecutor.execute({
							runId: dto.runId,
							sessionId: bs.sessionId,
							agentSlug: bs.agentSlug,
							mode: 'act',
							toolId: 'browser_fill',
							input: { selector: dto.selector ?? '', value: dto.value ?? '' },
							actorUserId: user.id,
							targetBrowserSessionId: browserSessionId,
						}),
					);
				case 'press':
					return this.unwrapBrowserAction(
						dto,
						await this.toolExecutor.execute({
							runId: dto.runId,
							sessionId: bs.sessionId,
							agentSlug: bs.agentSlug,
							mode: 'act',
							toolId: 'browser_press',
							input: { selector: dto.selector ?? '', key: dto.key ?? 'Enter' },
							actorUserId: user.id,
							targetBrowserSessionId: browserSessionId,
						}),
					);
				case 'close':
					return this.unwrapBrowserAction(
						dto,
						await this.toolExecutor.execute({
							runId: dto.runId,
							sessionId: bs.sessionId,
							agentSlug: bs.agentSlug,
							mode: 'act',
							toolId: 'browser_close',
							input: {},
							actorUserId: user.id,
							targetBrowserSessionId: browserSessionId,
						}),
					);
				default:
					throw new ForbiddenException();
			}
		}

		this.assertDirectBrowserDebug(user);
		switch (dto.type) {
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
			default:
				return {
					action: { type: dto.type },
					snapshot: await this.worker.waitForSelector(browserSessionId, dto.selector ?? '', dto.runId),
				};
		}
	}

	@Post('sessions/:browserSessionId/close')
	@UseGuards(SessionAccessGuard)
	@RequireBrowserSessionAccess('use')
	@RequirePermissions('browser.open')
	async close(@CurrentUser() user: AuthUser, @Param('browserSessionId') browserSessionId: string) {
		this.assertDirectBrowserDebug(user);
		const bs = await this.sessions.getBrowserSession(browserSessionId);
		if (!bs) throw new NotFoundException('Browser session not found');
		const res = await this.toolExecutor.execute({
			runId: bs.runId ?? 'browser-close',
			sessionId: bs.sessionId,
			agentSlug: bs.agentSlug,
			mode: 'act',
			toolId: 'browser_close',
			input: {},
			actorUserId: user.id,
			targetBrowserSessionId: browserSessionId,
		});
		return { ok: res.status === 'completed' || res.status === 'requires_approval', tool: res };
	}
}
