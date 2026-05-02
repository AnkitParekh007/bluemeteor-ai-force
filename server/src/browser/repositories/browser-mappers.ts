import type { BrowserSession as BrowserSessionRow } from '@prisma/client';

import { parseJson, stringifyJson } from '../../common/utils/json';
import type { BrowserSession } from '../models/browser-session.model';
import type { BrowserAction } from '../models/browser-action.model';
import type { BrowserSnapshot } from '../models/browser-snapshot.model';

export function mapBrowserSession(row: BrowserSessionRow): BrowserSession {
	return {
		id: row.id,
		sessionId: row.sessionId,
		runId: row.runId ?? undefined,
		agentSlug: row.agentSlug,
		url: row.url ?? undefined,
		title: row.title ?? undefined,
		status: row.status as BrowserSession['status'],
		headless: row.headless,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		expiresAt: row.expiresAt?.toISOString(),
		error: row.error ?? undefined,
	};
}

export function mapBrowserAction(row: {
	id: string;
	browserSessionId: string;
	runId: string;
	type: string;
	status: string;
	selector: string | null;
	value: string | null;
	url: string | null;
	resultJson: string | null;
	error: string | null;
	createdAt: Date;
	startedAt: Date | null;
	completedAt: Date | null;
}): BrowserAction {
	return {
		id: row.id,
		browserSessionId: row.browserSessionId,
		runId: row.runId,
		type: row.type as BrowserAction['type'],
		status: row.status as BrowserAction['status'],
		selector: row.selector ?? undefined,
		value: row.value ?? undefined,
		url: row.url ?? undefined,
		result: parseJson<Record<string, unknown> | undefined>(row.resultJson, undefined),
		error: row.error ?? undefined,
		createdAt: row.createdAt.toISOString(),
		startedAt: row.startedAt?.toISOString(),
		completedAt: row.completedAt?.toISOString(),
	};
}

export function mapBrowserSnapshot(row: {
	id: string;
	browserSessionId: string;
	runId: string | null;
	url: string | null;
	title: string | null;
	screenshotPath: string | null;
	screenshotUrl: string | null;
	domSummary: string | null;
	textContent: string | null;
	createdAt: Date;
}): BrowserSnapshot {
	return {
		id: row.id,
		browserSessionId: row.browserSessionId,
		runId: row.runId ?? undefined,
		url: row.url ?? undefined,
		title: row.title ?? undefined,
		screenshotPath: row.screenshotPath ?? undefined,
		screenshotUrl: row.screenshotUrl ?? undefined,
		domSummary: row.domSummary ?? undefined,
		textContent: row.textContent ?? undefined,
		createdAt: row.createdAt.toISOString(),
	};
}

export { stringifyJson };
