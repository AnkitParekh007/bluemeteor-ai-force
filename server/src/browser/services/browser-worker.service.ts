import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import type { Browser, BrowserContext, BrowserContextOptions, Page } from 'playwright';

import { AppConfigService } from '../../config/app-config.service';
import { newId } from '../../common/utils/ids';
import type { BrowserSession } from '../models/browser-session.model';
import type { BrowserSnapshot } from '../models/browser-snapshot.model';
import { BrowserSnapshotRepository } from '../repositories/browser-snapshot.repository';
import { BrowserSessionService } from './browser-session.service';

/** Safe Playwright-backed worker. Mutations require ENABLE_REAL_BROWSER_ACTIONS or explicit approval flag from executor. */
@Injectable()
export class BrowserWorkerService {
	private readonly log = new Logger(BrowserWorkerService.name);
	private chromium: Browser | null = null;
	private readonly contextByBrowserSessionId = new Map<string, BrowserContext>();
	private readonly pageByBrowserSessionId = new Map<string, Page>();
	private readonly actionsThisRun = new Map<string, number>();
	private readonly contextOptsBySessionId = new Map<string, { storageStatePath?: string }>();

	constructor(
		private readonly cfg: AppConfigService,
		private readonly sessions: BrowserSessionService,
		private readonly snapshots: BrowserSnapshotRepository,
	) {}

	private async ensureLaunched(): Promise<Browser> {
		if (this.chromium) return this.chromium;
		try {
			const { chromium } = await import('playwright');
			this.chromium = await chromium.launch({ headless: this.cfg.browserHeadless });
			return this.chromium;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			this.log.warn(`Playwright launch failed (${msg}). Install Chromium: npm run playwright:install`);
			throw new Error(
				'Browser automation unavailable. Install Chromium in server/: npm run playwright:install',
			);
		}
	}

	async resetBrowserContext(browserSessionId: string): Promise<void> {
		const page = this.pageByBrowserSessionId.get(browserSessionId);
		const ctx = this.contextByBrowserSessionId.get(browserSessionId);
		try {
			await page?.close();
		} catch {
			/* ignore */
		}
		try {
			await ctx?.close();
		} catch {
			/* ignore */
		}
		this.pageByBrowserSessionId.delete(browserSessionId);
		this.contextByBrowserSessionId.delete(browserSessionId);
	}

	/**
	 * Recreate Playwright context with optional saved storage state (cookies/localStorage).
	 * @param storageStatePath absolute path to storage state JSON, or null for a fresh context
	 */
	async attachProfileStorageState(browserSessionId: string, storageStatePath: string | null): Promise<void> {
		if (storageStatePath) {
			this.contextOptsBySessionId.set(browserSessionId, { storageStatePath });
		} else {
			this.contextOptsBySessionId.delete(browserSessionId);
		}
		await this.resetBrowserContext(browserSessionId);
	}

	async openAuthenticatedSession(
		browserSessionId: string,
		storageStatePath: string | null,
		url: string,
		runId: string,
	): Promise<BrowserSnapshot> {
		await this.attachProfileStorageState(browserSessionId, storageStatePath);
		return this.openUrl(browserSessionId, url, runId);
	}

	private async ensureContext(browserSessionId: string): Promise<Page> {
		let page = this.pageByBrowserSessionId.get(browserSessionId);
		if (page) return page;
		await this.ensureLaunched();
		const browser = this.chromium!;
		let ctx = this.contextByBrowserSessionId.get(browserSessionId);
		if (!ctx) {
			const opts = this.contextOptsBySessionId.get(browserSessionId) ?? {};
			const videoDir =
				this.cfg.browserRecordVideo && this.cfg.enableBrowserWorker
					? path.join(process.cwd(), this.cfg.browserVideoDir)
					: undefined;
			if (videoDir) await fs.mkdir(videoDir, { recursive: true });
			const ctxOpts: BrowserContextOptions = {
				viewport: { width: 1280, height: 720 },
				javaScriptEnabled: true,
			};
			if (opts.storageStatePath) {
				try {
					await fs.access(opts.storageStatePath);
					ctxOpts.storageState = opts.storageStatePath;
				} catch {
					this.log.warn(`Storage state file missing for session ${browserSessionId}; starting without auth`);
				}
			}
			if (videoDir) ctxOpts.recordVideo = { dir: videoDir };
			ctx = await browser.newContext(ctxOpts);
			this.contextByBrowserSessionId.set(browserSessionId, ctx);
		}
		page = await ctx.newPage();
		page.setDefaultTimeout(this.cfg.browserActionTimeoutMs);
		this.pageByBrowserSessionId.set(browserSessionId, page);
		return page;
	}

	async exportStorageState(browserSessionId: string): Promise<unknown> {
		const ctx = this.contextByBrowserSessionId.get(browserSessionId);
		if (!ctx) throw new NotFoundException('Browser context not found');
		return ctx.storageState();
	}

	async getCurrentPageState(
		browserSessionId: string,
	): Promise<{ url: string; title: string; summary: string }> {
		const page = this.pageByBrowserSessionId.get(browserSessionId);
		if (!page) throw new NotFoundException('No active page');
		const meta = await this.buildDomSummary(page);
		return {
			url: meta.url,
			title: meta.title,
			summary: meta.summary.length > 8000 ? `${meta.summary.slice(0, 8000)}…` : meta.summary,
		};
	}

	async startTrace(browserSessionId: string): Promise<void> {
		if (!this.cfg.browserTraceEnabled || !this.cfg.enableBrowserWorker) return;
		const ctx = this.contextByBrowserSessionId.get(browserSessionId);
		if (!ctx) return;
		const dir = path.join(process.cwd(), this.cfg.browserTraceDir);
		await fs.mkdir(dir, { recursive: true });
		await ctx.tracing.start({ screenshots: true, snapshots: true });
	}

	/** Returns workspace-relative trace path for internal artifact linking. */
	async stopTrace(browserSessionId: string): Promise<string | undefined> {
		if (!this.cfg.browserTraceEnabled || !this.cfg.enableBrowserWorker) return undefined;
		const ctx = this.contextByBrowserSessionId.get(browserSessionId);
		if (!ctx) return undefined;
		const dir = path.join(process.cwd(), this.cfg.browserTraceDir);
		await fs.mkdir(dir, { recursive: true });
		const file = path.join(dir, `${browserSessionId}-${Date.now()}.zip`);
		await ctx.tracing.stop({ path: file });
		return path.relative(process.cwd(), file).replace(/\\/g, '/');
	}

	assertUrlAllowed(rawUrl: string): URL {
		const u = rawUrl.trim();
		const lower = u.toLowerCase();
		if (
			lower.startsWith('javascript:') ||
			lower.startsWith('file:') ||
			lower.startsWith('chrome:') ||
			lower.startsWith('vscode:') ||
			lower.startsWith('data:')
		) {
			throw new Error(`Blocked URL scheme: ${rawUrl.slice(0, 32)}`);
		}
		let parsed: URL;
		try {
			parsed = new URL(u);
		} catch {
			throw new Error('Invalid URL');
		}
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			throw new Error(`Blocked protocol: ${parsed.protocol}`);
		}
		const allowed = this.cfg.browserAllowedOrigins.some((o) => {
			try {
				return parsed.origin === new URL(o).origin;
			} catch {
				return false;
			}
		});
		if (!allowed) {
			throw new Error(`URL origin not allowed: ${parsed.origin}. Configure BROWSER_ALLOWED_ORIGINS.`);
		}
		return parsed;
	}

	private bumpAction(runId: string): void {
		const n = (this.actionsThisRun.get(runId) ?? 0) + 1;
		if (n > this.cfg.browserMaxActionsPerRun) {
			throw new Error(`Maximum browser actions per run (${this.cfg.browserMaxActionsPerRun}) exceeded.`);
		}
		this.actionsThisRun.set(runId, n);
	}

	private mutationAllowed(forceApproved: boolean): boolean {
		if (this.cfg.enableRealBrowserActions) return true;
		return forceApproved;
	}

	/** Exposed for auth capture / demo flows (approval-gated at tool layer). */
	allowsMutation(forceApproved: boolean): boolean {
		return this.mutationAllowed(forceApproved);
	}

	async getOrOpenPage(browserSessionId: string): Promise<Page> {
		return this.ensureContext(browserSessionId);
	}

	async ensureBrowserSession(browserSession: BrowserSession): Promise<void> {
		if (!this.cfg.enableBrowserWorker) return;
		await this.ensureContext(browserSession.id);
	}

	private async buildDomSummary(page: Page): Promise<{ title: string; url: string; summary: string; textSample: string }> {
		const url = page.url();
		const title = await page.title();
		const summaryJson = await page.evaluate(() => {
			const headings = [...document.querySelectorAll('h1,h2,h3')]
				.map((h) => (h.textContent ?? '').trim())
				.filter(Boolean)
				.slice(0, 15);
			const buttons = [...document.querySelectorAll('button,[role="button"]')]
				.map((b) => (b.textContent ?? '').trim())
				.filter(Boolean)
				.slice(0, 20);
			const inputs = [...document.querySelectorAll('input,textarea,select')]
				.map((el) => ({
					tag: el.tagName.toLowerCase(),
					type: (el as HTMLInputElement).type,
					placeholder: el.getAttribute('placeholder') ?? '',
					name: el.getAttribute('name') ?? '',
				}))
				.slice(0, 15);
			const links = [...document.querySelectorAll('a[href]')]
				.map((a) => ({
					text: (a.textContent ?? '').trim().slice(0, 80),
					href: (a as HTMLAnchorElement).href.slice(0, 120),
				}))
				.filter((x) => x.text || x.href)
				.slice(0, 20);
			const forms = document.forms.length;
			return JSON.stringify({ headings, buttons, inputs, links, forms });
		});
		let textSample = '';
		try {
			textSample = (await page.evaluate(() => document.body?.innerText ?? '')).slice(0, 4000);
		} catch {
			textSample = '';
		}
		const compact = `Title: ${title}\nURL: ${url}\n${summaryJson}`;
		const summary = compact.length > 12000 ? `${compact.slice(0, 12000)}…` : compact;
		return { title, url, summary, textSample };
	}

	private async persistSnapshot(
		browserSessionId: string,
		runId: string | undefined,
		partial: Omit<BrowserSnapshot, 'id' | 'browserSessionId' | 'createdAt'> & { createdAt?: string },
	): Promise<BrowserSnapshot> {
		const row = await this.snapshots.create({
			id: newId('bsnap'),
			browserSessionId,
			runId: runId ?? null,
			url: partial.url ?? null,
			title: partial.title ?? null,
			screenshotPath: partial.screenshotPath ?? null,
			screenshotUrl: partial.screenshotUrl ?? null,
			domSummary: partial.domSummary ?? null,
			textContent: partial.textContent ?? null,
			createdAt: new Date(),
		});
		return row;
	}

	private async mockSnapshot(bs: BrowserSession, runId: string | undefined, hint: string): Promise<BrowserSnapshot> {
		return this.persistSnapshot(bs.id, runId, {
			url: bs.url ?? this.cfg.browserDefaultUrl,
			title: bs.title ?? 'Browser (mock)',
			domSummary: hint,
			textContent: 'Enable ENABLE_BROWSER_WORKER=true and run npm run playwright:install for live automation.',
		});
	}

	async openUrl(browserSessionId: string, url: string, runId: string): Promise<BrowserSnapshot> {
		this.bumpAction(runId);
		this.assertUrlAllowed(url);
		const bs = await this.sessions.getBrowserSession(browserSessionId);
		if (!bs) throw new NotFoundException('Browser session not found');
		if (!this.cfg.enableBrowserWorker) {
			await this.sessions.markOpen(browserSessionId, url, bs.title ?? 'Mock');
			return this.mockSnapshot(bs, runId, 'Browser worker disabled (ENABLE_BROWSER_WORKER=false).');
		}
		try {
			const page = await this.ensureContext(browserSessionId);
			await page.goto(url, { timeout: this.cfg.browserActionTimeoutMs, waitUntil: 'domcontentloaded' });
			const { title, url: u, summary, textSample } = await this.buildDomSummary(page);
			await this.sessions.markOpen(browserSessionId, u, title);
			return this.persistSnapshot(browserSessionId, runId, {
				url: u,
				title,
				domSummary: summary,
				textContent: textSample,
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			await this.sessions.markFailed(browserSessionId, msg);
			throw e;
		}
	}

	async click(browserSessionId: string, selector: string, runId: string, forceApproved = false): Promise<BrowserSnapshot> {
		this.bumpAction(runId);
		if (!this.mutationAllowed(forceApproved)) {
			throw new Error('Interactive browser actions require ENABLE_REAL_BROWSER_ACTIONS=true or explicit approval.');
		}
		if (!this.cfg.enableBrowserWorker) {
			const bs = await this.sessions.getBrowserSession(browserSessionId);
			if (!bs) throw new NotFoundException();
			return this.mockSnapshot(bs, runId, `Mock click: ${selector}`);
		}
		const page = await this.ensureContext(browserSessionId);
		await page.click(selector, { timeout: this.cfg.browserActionTimeoutMs });
		const meta = await this.buildDomSummary(page);
		return this.persistSnapshot(browserSessionId, runId, {
			url: meta.url,
			title: meta.title,
			domSummary: meta.summary,
			textContent: meta.textSample,
		});
	}

	async fill(browserSessionId: string, selector: string, value: string, runId: string, forceApproved = false): Promise<BrowserSnapshot> {
		this.bumpAction(runId);
		if (!this.mutationAllowed(forceApproved)) {
			throw new Error('Form fill requires ENABLE_REAL_BROWSER_ACTIONS=true or explicit approval.');
		}
		if (!this.cfg.enableBrowserWorker) {
			const bs = await this.sessions.getBrowserSession(browserSessionId);
			if (!bs) throw new NotFoundException();
			return this.mockSnapshot(bs, runId, `Mock fill: ${selector}`);
		}
		const page = await this.ensureContext(browserSessionId);
		await page.fill(selector, value, { timeout: this.cfg.browserActionTimeoutMs });
		const meta = await this.buildDomSummary(page);
		return this.persistSnapshot(browserSessionId, runId, {
			url: meta.url,
			title: meta.title,
			domSummary: meta.summary,
			textContent: meta.textSample,
		});
	}

	async press(browserSessionId: string, selector: string, key: string, runId: string, forceApproved = false): Promise<BrowserSnapshot> {
		this.bumpAction(runId);
		if (!this.mutationAllowed(forceApproved)) {
			throw new Error('Key press requires ENABLE_REAL_BROWSER_ACTIONS=true or explicit approval.');
		}
		if (!this.cfg.enableBrowserWorker) {
			const bs = await this.sessions.getBrowserSession(browserSessionId);
			if (!bs) throw new NotFoundException();
			return this.mockSnapshot(bs, runId, `Mock press: ${key}`);
		}
		const page = await this.ensureContext(browserSessionId);
		await page.press(selector, key, { timeout: this.cfg.browserActionTimeoutMs });
		const meta = await this.buildDomSummary(page);
		return this.persistSnapshot(browserSessionId, runId, {
			url: meta.url,
			title: meta.title,
			domSummary: meta.summary,
			textContent: meta.textSample,
		});
	}

	async waitForSelector(browserSessionId: string, selector: string, runId: string): Promise<BrowserSnapshot> {
		this.bumpAction(runId);
		if (!this.cfg.enableBrowserWorker) {
			const bs = await this.sessions.getBrowserSession(browserSessionId);
			if (!bs) throw new NotFoundException();
			return this.mockSnapshot(bs, runId, `Mock wait: ${selector}`);
		}
		const page = await this.ensureContext(browserSessionId);
		await page.waitForSelector(selector, { timeout: this.cfg.browserActionTimeoutMs });
		const meta = await this.buildDomSummary(page);
		return this.persistSnapshot(browserSessionId, runId, {
			url: meta.url,
			title: meta.title,
			domSummary: meta.summary,
			textContent: meta.textSample,
		});
	}

	async takeScreenshot(browserSessionId: string, runId: string): Promise<BrowserSnapshot> {
		this.bumpAction(runId);
		const bs = await this.sessions.getBrowserSession(browserSessionId);
		if (!bs) throw new NotFoundException();
		if (!this.cfg.enableBrowserWorker || !this.cfg.browserScreenshotEnabled) {
			return this.mockSnapshot(bs, runId, 'Screenshot skipped (worker or screenshots disabled).');
		}
		const page = await this.ensureContext(browserSessionId);
		const fileName = `${browserSessionId}-${Date.now()}.png`;
		const dir = path.join(process.cwd(), this.cfg.browserScreenshotDir);
		await fs.mkdir(dir, { recursive: true });
		const diskPath = path.join(dir, fileName);
		await page.screenshot({ path: diskPath, fullPage: false });
		const meta = await this.buildDomSummary(page);
		const publicUrl = `/browser/screenshots/${fileName}`;
		return this.persistSnapshot(browserSessionId, runId, {
			url: meta.url,
			title: meta.title,
			screenshotPath: diskPath,
			screenshotUrl: publicUrl,
			domSummary: meta.summary,
			textContent: meta.textSample,
		});
	}

	async inspectDom(browserSessionId: string, runId: string): Promise<BrowserSnapshot> {
		this.bumpAction(runId);
		const bs = await this.sessions.getBrowserSession(browserSessionId);
		if (!bs) throw new NotFoundException();
		if (!this.cfg.enableBrowserWorker) {
			return this.mockSnapshot(bs, runId, 'DOM inspection mock — enable browser worker for live page.');
		}
		const page = await this.ensureContext(browserSessionId);
		const meta = await this.buildDomSummary(page);
		return this.persistSnapshot(browserSessionId, runId, {
			url: meta.url,
			title: meta.title,
			domSummary: meta.summary,
			textContent: meta.textSample,
		});
	}

	async extractText(browserSessionId: string, runId: string): Promise<BrowserSnapshot> {
		this.bumpAction(runId);
		const bs = await this.sessions.getBrowserSession(browserSessionId);
		if (!bs) throw new NotFoundException();
		if (!this.cfg.enableBrowserWorker) {
			return this.mockSnapshot(bs, runId, 'Text extraction mock.');
		}
		const page = await this.ensureContext(browserSessionId);
		const meta = await this.buildDomSummary(page);
		return this.persistSnapshot(browserSessionId, runId, {
			url: meta.url,
			title: meta.title,
			domSummary: meta.summary.slice(0, 6000),
			textContent: meta.textSample,
		});
	}

	async close(browserSessionId: string): Promise<void> {
		const page = this.pageByBrowserSessionId.get(browserSessionId);
		const ctx = this.contextByBrowserSessionId.get(browserSessionId);
		try {
			await page?.close();
		} catch {
			/* ignore */
		}
		try {
			await ctx?.close();
		} catch {
			/* ignore */
		}
		this.pageByBrowserSessionId.delete(browserSessionId);
		this.contextByBrowserSessionId.delete(browserSessionId);
		this.contextOptsBySessionId.delete(browserSessionId);
		await this.sessions.closeBrowserSession(browserSessionId);
	}

	/** Legacy orchestrator hook — opens mock session row when worker off. */
	openBrowserMock(sessionId: string, runId: string, url = 'http://localhost:4200'): Promise<BrowserSession> {
		return this.sessions.createMockBrowserSession(sessionId, runId, url);
	}

	inspectPageMock(): { summary: string } {
		return {
			summary: 'Mock inspect: enable ENABLE_BROWSER_WORKER for Playwright-backed DOM.',
		};
	}
}
