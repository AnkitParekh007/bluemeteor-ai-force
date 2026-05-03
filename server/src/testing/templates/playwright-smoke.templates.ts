import type { Page } from 'playwright';

import type { PlaywrightTestCase } from '../models/playwright-test.model';

export interface SmokeTemplateConfig {
	readonly loginUrl: string;
	readonly baseUrl: string;
	readonly supplierUploadPath?: string;
}

function caseResult(
	id: string,
	testRunId: string,
	title: string,
	status: PlaywrightTestCase['status'],
	durationMs: number,
	error?: string,
): PlaywrightTestCase {
	return {
		id,
		testRunId,
		title,
		status,
		durationMs,
		error,
		createdAt: new Date().toISOString(),
	};
}

export async function runLoginSmoke(
	page: Page,
	testRunId: string,
	config: SmokeTemplateConfig,
	hasAuthProfile: boolean,
	newId: (p: string) => string,
): Promise<PlaywrightTestCase[]> {
	const t0 = Date.now();
	const cases: PlaywrightTestCase[] = [];
	try {
		await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
		const url = page.url();
		const title = await page.title();
		if (hasAuthProfile) {
			const onLoginOnly = url.includes('/login');
			cases.push(
				caseResult(
					newId('ptc'),
					testRunId,
					'Authenticated session reaches app',
					onLoginOnly ? 'failed' : 'passed',
					Date.now() - t0,
					onLoginOnly ? 'Still on login with profile — session may be expired' : undefined,
				),
			);
		} else {
			const hasEmail = (await page.locator('input[type="email"],#email').count()) > 0;
			const hasPassword = (await page.locator('input[type="password"],#password-field').count()) > 0;
			const ok = hasEmail && hasPassword && title.length > 0;
			cases.push(
				caseResult(
					newId('ptc'),
					testRunId,
					'Login form renders',
					ok ? 'passed' : 'failed',
					Date.now() - t0,
					ok ? undefined : 'Expected email/password fields on login page',
				),
			);
		}
	} catch (e) {
		cases.push(
			caseResult(
				newId('ptc'),
				testRunId,
				'Login smoke navigation',
				'failed',
				Date.now() - t0,
				e instanceof Error ? e.message : String(e),
			),
		);
	}
	return cases;
}

export async function runDashboardSmoke(
	page: Page,
	testRunId: string,
	config: SmokeTemplateConfig,
	newId: (p: string) => string,
): Promise<PlaywrightTestCase[]> {
	const t0 = Date.now();
	try {
		const dash = new URL('/dashboard', config.baseUrl).href;
		await page.goto(dash, { waitUntil: 'domcontentloaded', timeout: 45_000 });
		const text = await page.locator('body').innerText().catch(() => '');
		const ok = text.length > 20;
		return [
			caseResult(
				newId('ptc'),
				testRunId,
				'Dashboard loads',
				ok ? 'passed' : 'failed',
				Date.now() - t0,
				ok ? undefined : 'Dashboard body text too short — possible redirect to login',
			),
		];
	} catch (e) {
		return [
			caseResult(
				newId('ptc'),
				testRunId,
				'Dashboard loads',
				'failed',
				Date.now() - t0,
				e instanceof Error ? e.message : String(e),
			),
		];
	}
}

export async function runSupplierUploadSmoke(
	page: Page,
	testRunId: string,
	config: SmokeTemplateConfig,
	newId: (p: string) => string,
): Promise<PlaywrightTestCase[]> {
	const t0 = Date.now();
	const pathSeg = config.supplierUploadPath ?? '/dashboard';
	try {
		const target = new URL(pathSeg, config.baseUrl).href;
		await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
		const title = await page.title();
		const ok = title.length > 0;
		return [
			caseResult(
				newId('ptc'),
				testRunId,
				'Supplier/upload route reachable',
				ok ? 'passed' : 'failed',
				Date.now() - t0,
				ok ? undefined : 'Page did not expose a title',
			),
		];
	} catch (e) {
		return [
			caseResult(
				newId('ptc'),
				testRunId,
				'Supplier/upload route reachable',
				'failed',
				Date.now() - t0,
				e instanceof Error ? e.message : String(e),
			),
		];
	}
}
