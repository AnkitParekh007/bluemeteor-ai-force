export type BrowserActionType =
	| 'open_url'
	| 'click'
	| 'fill'
	| 'select'
	| 'press'
	| 'wait_for_selector'
	| 'wait_for_timeout'
	| 'screenshot'
	| 'inspect_dom'
	| 'extract_text'
	| 'close';

export type BrowserActionStatus =
	| 'queued'
	| 'running'
	| 'completed'
	| 'failed'
	| 'blocked'
	| 'requires_approval';

export interface BrowserAction {
	readonly id: string;
	readonly browserSessionId: string;
	readonly runId: string;
	readonly type: BrowserActionType;
	readonly status: BrowserActionStatus;
	readonly selector?: string;
	readonly value?: string;
	readonly url?: string;
	readonly result?: Record<string, unknown>;
	readonly error?: string;
	readonly createdAt: string;
	readonly startedAt?: string;
	readonly completedAt?: string;
}
