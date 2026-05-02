export type BrowserSessionStatus =
	| 'created'
	| 'opening'
	| 'open'
	| 'closed'
	| 'failed'
	| 'expired';

export interface BrowserSession {
	readonly id: string;
	readonly sessionId: string;
	readonly runId?: string;
	readonly agentSlug: string;
	readonly url?: string;
	readonly title?: string;
	readonly status: BrowserSessionStatus;
	readonly headless: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly expiresAt?: string;
	readonly error?: string;
}
