export interface BrowserSnapshot {
	readonly id: string;
	readonly browserSessionId: string;
	readonly runId?: string;
	readonly url?: string;
	readonly title?: string;
	readonly screenshotPath?: string;
	readonly screenshotUrl?: string;
	readonly domSummary?: string;
	readonly textContent?: string;
	readonly createdAt: string;
}
