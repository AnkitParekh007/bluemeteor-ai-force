import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import type { BrowserContextOptions } from 'playwright';

import { BrowserProfileService } from '../../browser/services/browser-profile.service';
import { newId } from '../../common/utils/ids';
import { AppConfigService } from '../../config/app-config.service';
import type { PlaywrightSpec, PlaywrightTestCase, PlaywrightTestRun } from '../models/playwright-test.model';
import { PlaywrightSpecRepository } from '../repositories/playwright-spec.repository';
import { PlaywrightTestCaseRepository } from '../repositories/playwright-test-case.repository';
import { PlaywrightTestRunRepository } from '../repositories/playwright-test-run.repository';
import {
	runDashboardSmoke,
	runLoginSmoke,
	runSupplierUploadSmoke,
	type SmokeTemplateConfig,
} from '../templates/playwright-smoke.templates';
import { validateGeneratedSpec } from '../utils/playwright-spec-sanitizer';

@Injectable()
export class PlaywrightTestRunnerService {
	private readonly log = new Logger(PlaywrightTestRunnerService.name);

	constructor(
		private readonly cfg: AppConfigService,
		private readonly profiles: BrowserProfileService,
		private readonly specRepo: PlaywrightSpecRepository,
		private readonly runRepo: PlaywrightTestRunRepository,
		private readonly caseRepo: PlaywrightTestCaseRepository,
	) {}

	async generateSpecFromTemplate(input: {
		sessionId: string;
		runId?: string;
		agentSlug: string;
		templateKey: string;
	}): Promise<PlaywrightSpec> {
		if (!this.cfg.playwrightAllowedTestTemplates.includes(input.templateKey)) {
			throw new BadRequestException(`Unknown or disallowed template: ${input.templateKey}`);
		}
		const body = `import { test, expect } from '@playwright/test';\n\ntest('${input.templateKey}', async ({ page }) => {\n  // Generated scaffold — run via controlled template runner only\n  await page.goto('/');\n});\n`;
		return this.specRepo.create({
			id: newId('pspec'),
			sessionId: input.sessionId,
			runId: input.runId ?? null,
			agentSlug: input.agentSlug,
			title: `${input.templateKey}.spec.ts`,
			templateKey: input.templateKey,
			content: body,
			status: 'generated',
			createdAt: new Date(),
			metadataJson: JSON.stringify({ source: 'template' }),
		});
	}

	async generateSpecArtifact(input: {
		sessionId: string;
		runId?: string;
		agentSlug: string;
		title: string;
		message?: string;
	}): Promise<PlaywrightSpec> {
		const hint = (input.message ?? '').slice(0, 2000);
		const body = `import { test, expect } from '@playwright/test';\n\n// Context: ${hint.replace(/\n/g, ' ')}\ntest('draft', async ({ page }) => {\n  await page.goto('/');\n});\n`;
		return this.specRepo.create({
			id: newId('pspec'),
			sessionId: input.sessionId,
			runId: input.runId ?? null,
			agentSlug: input.agentSlug,
			title: input.title.endsWith('.ts') ? input.title : `${input.title}.spec.ts`,
			content: body,
			status: 'draft',
			createdAt: new Date(),
			metadataJson: JSON.stringify({ source: 'agent_message' }),
		});
	}

	validateGeneratedSpec(content: string): ReturnType<typeof validateGeneratedSpec> {
		return validateGeneratedSpec(content);
	}

	async validateStoredSpec(specId: string): Promise<ReturnType<typeof validateGeneratedSpec>> {
		const spec = await this.specRepo.findById(specId);
		if (!spec) return { valid: false, reasons: ['not_found'] };
		const v = validateGeneratedSpec(spec.content);
		if (v.valid) await this.specRepo.update(specId, { status: 'validated', updatedAt: new Date() });
		else await this.specRepo.update(specId, { status: 'blocked', updatedAt: new Date() });
		return v;
	}

	async runTemplateTest(input: {
		sessionId: string;
		runId?: string;
		agentSlug: string;
		templateKey: string;
		profileId?: string;
	}): Promise<PlaywrightTestRun> {
		this.cfg.assertTestTargetAllowsExecution();
		if (!this.cfg.playwrightAllowedTestTemplates.includes(input.templateKey)) {
			throw new BadRequestException(`Template not allowed: ${input.templateKey}`);
		}

		const runDbId = newId('ptrun');
		const started = new Date();
		const baseConfig: SmokeTemplateConfig = {
			baseUrl: this.cfg.testTargetBaseUrl.replace(/\/$/, ''),
			loginUrl: this.cfg.testTargetLoginUrl,
			supplierUploadPath: '/dashboard',
		};

		if (!this.cfg.enableRealPlaywrightTests) {
			return this.runRepo.create({
				id: runDbId,
				sessionId: input.sessionId,
				runId: input.runId ?? null,
				agentSlug: input.agentSlug,
				profileId: input.profileId ?? null,
				status: 'blocked',
				total: 0,
				passed: 0,
				failed: 0,
				skipped: 1,
				startedAt: started,
				completedAt: new Date(),
				error: 'Real Playwright tests disabled (ENABLE_REAL_PLAYWRIGHT_TESTS=false).',
				metadataJson: JSON.stringify({ templateKey: input.templateKey, mock: true }),
			});
		}

		let storagePath: string | null = null;
		if (input.profileId) {
			await this.profiles.touchLastUsed(input.profileId);
			storagePath = await this.profiles.getStorageStatePath(input.profileId);
		}

		const { chromium } = await import('playwright');
		await this.runRepo.create({
			id: runDbId,
			sessionId: input.sessionId,
			runId: input.runId ?? null,
			agentSlug: input.agentSlug,
			profileId: input.profileId ?? null,
			status: 'running',
			total: 0,
			passed: 0,
			failed: 0,
			skipped: 0,
			startedAt: started,
			completedAt: null,
			metadataJson: JSON.stringify({ templateKey: input.templateKey }),
		});

		const browser = await chromium.launch({ headless: this.cfg.browserHeadless });
		const ctxOpts: BrowserContextOptions = { viewport: { width: 1280, height: 720 } };
		if (storagePath) {
			try {
				await fs.access(storagePath);
				ctxOpts.storageState = storagePath;
			} catch {
				this.log.warn('Profile storage state missing; running without auth');
			}
		}
		const context = await browser.newContext(ctxOpts);
		const page = await context.newPage();
		page.setDefaultTimeout(Math.min(this.cfg.playwrightMaxTestDurationMs, 120_000));

		let cases: PlaywrightTestCase[] = [];
		const deadline = Date.now() + this.cfg.playwrightMaxTestDurationMs;

		try {
			if (input.templateKey === 'login_smoke') {
				cases = await runLoginSmoke(page, runDbId, baseConfig, !!storagePath, newId);
			} else if (input.templateKey === 'dashboard_smoke') {
				cases = await runDashboardSmoke(page, runDbId, baseConfig, newId);
			} else if (input.templateKey === 'supplier_upload_smoke') {
				cases = await runSupplierUploadSmoke(page, runDbId, baseConfig, newId);
			}

			if (cases.length > this.cfg.playwrightMaxTestsPerRun) {
				cases = cases.slice(0, this.cfg.playwrightMaxTestsPerRun);
			}

			let screenshotRel: string | undefined;
			const failed = cases.filter((c) => c.status === 'failed');
			if (
				(failed.length > 0 && this.cfg.playwrightCaptureScreenshotOnFailure) ||
				cases.length > 0
			) {
				const dir = path.join(process.cwd(), this.cfg.browserScreenshotDir);
				await fs.mkdir(dir, { recursive: true });
				const file = `${runDbId}.png`;
				const disk = path.join(dir, file);
				try {
					await page.screenshot({ path: disk, fullPage: false });
					screenshotRel = `/test-assets/screenshots/${file}`;
				} catch {
					/* ignore */
				}
				if (failed.length > 0 && screenshotRel) {
					cases = cases.map((c) =>
						c.status === 'failed' ? { ...c, screenshotPath: screenshotRel } : c,
					);
				}
			}

			const passed = cases.filter((c) => c.status === 'passed').length;
			const failN = cases.filter((c) => c.status === 'failed').length;
			const skipN = cases.filter((c) => c.status === 'skipped').length;
			const status = failN > 0 ? 'failed' : 'passed';

			await this.caseRepo.createMany(
				cases.map((c) => ({
					id: c.id,
					testRunId: runDbId,
					title: c.title,
					status: c.status,
					durationMs: c.durationMs ?? null,
					error: c.error ?? null,
					screenshotPath: c.screenshotPath ?? null,
					createdAt: new Date(c.createdAt),
				})),
			);

			const reportMd = this.buildReportMarkdown(input.templateKey, cases, screenshotRel);
			const reportDir = path.join(process.cwd(), this.cfg.playwrightTestOutputDir);
			await fs.mkdir(reportDir, { recursive: true });
			const reportFile = `${runDbId}.md`;
			const reportPathDisk = path.join(reportDir, reportFile);
			await fs.writeFile(reportPathDisk, reportMd, 'utf8');
			const reportPublic = `/test-assets/reports/${reportFile}`;

			if (Date.now() > deadline) {
				this.log.warn('Template run exceeded suggested deadline');
			}

			await browser.close();

			return this.runRepo.update(runDbId, {
				status,
				total: cases.length,
				passed,
				failed: failN,
				skipped: skipN,
				durationMs: Date.now() - started.getTime(),
				completedAt: new Date(),
				resultJson: JSON.stringify({ cases: cases.map((c) => ({ title: c.title, status: c.status })) }),
				reportPath: reportPublic,
				screenshotPath: screenshotRel ?? null,
				metadataJson: JSON.stringify({ templateKey: input.templateKey }),
			});
		} catch (e) {
			try {
				await browser.close();
			} catch {
				/* ignore */
			}
			const err = e instanceof Error ? e.message : String(e);
			return this.runRepo.update(runDbId, {
				status: 'failed',
				total: 1,
				passed: 0,
				failed: 1,
				skipped: 0,
				completedAt: new Date(),
				error: err,
				metadataJson: JSON.stringify({ templateKey: input.templateKey }),
			});
		}
	}

	async runValidatedSpec(input: {
		sessionId: string;
		runId?: string;
		agentSlug: string;
		specId: string;
		profileId?: string;
	}): Promise<PlaywrightTestRun> {
		const spec = await this.specRepo.findById(input.specId);
		if (!spec) throw new NotFoundException('Spec not found');
		const v = validateGeneratedSpec(spec.content);
		if (!v.valid) {
			await this.specRepo.update(spec.id, { status: 'blocked', updatedAt: new Date() });
			throw new BadRequestException(`Spec failed validation: ${v.reasons.join('; ')}`);
		}
		await this.specRepo.update(spec.id, { status: 'validated', updatedAt: new Date() });

		const runDbId = newId('ptrun');
		const started = new Date();
		const outDir = path.join(process.cwd(), this.cfg.playwrightGeneratedSpecDir);
		await fs.mkdir(outDir, { recursive: true });
		const specFile = `${spec.id}.spec.ts`;
		const specPath = path.join(outDir, specFile);
		await fs.writeFile(specPath, spec.content, 'utf8');
		await this.specRepo.update(spec.id, {
			specPath: path.relative(process.cwd(), specPath).replace(/\\/g, '/'),
			updatedAt: new Date(),
		});

		if (!this.cfg.enableRealPlaywrightTests) {
			return this.runRepo.create({
				id: runDbId,
				sessionId: input.sessionId,
				runId: input.runId ?? null,
				agentSlug: input.agentSlug,
				profileId: input.profileId ?? null,
				status: 'blocked',
				total: 0,
				passed: 0,
				failed: 0,
				skipped: 1,
				startedAt: started,
				completedAt: new Date(),
				error:
					'Validated spec saved as artifact; executing generated TypeScript via Playwright CLI is not enabled in this build.',
				metadataJson: JSON.stringify({ specId: spec.id, validated: true }),
			});
		}

		return this.runRepo.create({
			id: runDbId,
			sessionId: input.sessionId,
			runId: input.runId ?? null,
			agentSlug: input.agentSlug,
			profileId: input.profileId ?? null,
			status: 'blocked',
			total: 0,
			passed: 0,
			failed: 0,
			skipped: 1,
			startedAt: started,
			completedAt: new Date(),
			error:
				'Spec validated and stored; use template runner (playwright_run_template) for executed smoke tests in this phase.',
			metadataJson: JSON.stringify({ specId: spec.id, validated: true }),
		});
	}

	async listTestRuns(sessionId: string): Promise<PlaywrightTestRun[]> {
		return this.runRepo.listBySessionId(sessionId);
	}

	async getTestRun(testRunId: string): Promise<PlaywrightTestRun> {
		const r = await this.runRepo.findById(testRunId);
		if (!r) throw new NotFoundException('Test run not found');
		return r;
	}

	private buildReportMarkdown(
		templateKey: string,
		cases: PlaywrightTestCase[],
		screenshotUrl?: string,
	): string {
		let md = `# Playwright template: ${templateKey}\n\n`;
		for (const c of cases) {
			md += `- **${c.title}** — ${c.status}${c.error ? `: ${c.error}` : ''}\n`;
		}
		if (screenshotUrl) md += `\n![screenshot](${screenshotUrl})\n`;
		return md;
	}
}
