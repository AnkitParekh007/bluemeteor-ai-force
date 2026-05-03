import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'node:path';

import { AppConfigService } from '../../config/app-config.service';
import { StartupValidationService } from '../../config/startup-validation.service';
import { PrismaService } from '../../database/prisma.service';
import { AiProviderRouterService } from '../../providers/services/ai-provider-router.service';
import { TOOL_CATALOG } from '../../tools/tool-catalog';

export interface ReadinessCheck {
	readonly name: string;
	readonly ok: boolean;
	readonly detail?: string;
}

@Injectable()
export class ReadinessService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly cfg: AppConfigService,
		private readonly router: AiProviderRouterService,
		private readonly startup: StartupValidationService,
	) {}

	async evaluate(): Promise<{ status: 'ready' | 'not_ready'; checks: ReadinessCheck[] }> {
		const checks: ReadinessCheck[] = [];

		try {
			await this.prisma.$queryRaw`SELECT 1`;
			checks.push({ name: 'database', ok: true });
		} catch (e) {
			checks.push({
				name: 'database',
				ok: false,
				detail: e instanceof Error ? e.message : 'connect_failed',
			});
		}

		try {
			const n = await this.prisma.ragDocument.count();
			checks.push({ name: 'rag_tables', ok: true, detail: `${n} document(s)` });
		} catch (e) {
			checks.push({
				name: 'rag_tables',
				ok: false,
				detail: e instanceof Error ? e.message : 'rag_error',
			});
		}

		try {
			this.router.getActiveProvider();
			checks.push({ name: 'provider_router', ok: true, detail: this.cfg.agentProvider });
		} catch (e) {
			checks.push({
				name: 'provider_router',
				ok: false,
				detail: e instanceof Error ? e.message : 'router_error',
			});
		}

		checks.push({
			name: 'auth_configured',
			ok: Boolean(this.cfg.jwtAccessSecret && this.cfg.jwtRefreshSecret),
		});

		checks.push({
			name: 'rbac',
			ok: this.cfg.enableRbac,
			detail: this.cfg.enableRbac ? 'enabled' : 'disabled',
		});

		const toolCount = TOOL_CATALOG.length;
		checks.push({
			name: 'tool_registry',
			ok: toolCount > 0,
			detail: `${toolCount} tools`,
		});

		for (const sub of [
			'browser-screenshots',
			'browser-videos',
			'browser-traces',
			'browser-auth-states',
			'generated-tests',
			'playwright-results',
			'logs',
		]) {
			const dir =
				sub === 'logs'
					? path.join(this.cfg.storageRootAbs(), 'logs')
					: this.cfg.resolveStoragePath(
							sub === 'browser-screenshots'
								? 'BROWSER_SCREENSHOT_DIR'
								: sub === 'browser-videos'
									? 'BROWSER_VIDEO_DIR'
									: sub === 'browser-traces'
										? 'BROWSER_TRACE_DIR'
										: sub === 'browser-auth-states'
											? 'BROWSER_AUTH_STATE_DIR'
											: sub === 'generated-tests'
												? 'PLAYWRIGHT_GENERATED_SPEC_DIR'
												: 'PLAYWRIGHT_TEST_OUTPUT_DIR',
							sub,
						);
			try {
				await fs.mkdir(dir, { recursive: true });
				await fs.access(dir, fs.constants.W_OK);
				checks.push({ name: `storage:${sub}`, ok: true });
			} catch (e) {
				checks.push({
					name: `storage:${sub}`,
					ok: false,
					detail: e instanceof Error ? e.message : 'not_writable',
				});
			}
		}

		checks.push({
			name: 'browser_worker',
			ok: true,
			detail: this.cfg.enableBrowserWorker ? 'enabled' : 'disabled',
		});

		const syncVal = this.startup.evaluateSync();
		for (const err of syncVal.errors) {
			checks.push({ name: 'startup_validation', ok: false, detail: err });
		}

		const ok = checks.filter((c) => !c.ok).length === 0;
		return { status: ok ? 'ready' : 'not_ready', checks };
	}
}
