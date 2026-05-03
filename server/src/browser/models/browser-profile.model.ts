export type BrowserProfileStatus =
	| 'new'
	| 'auth_required'
	| 'capturing'
	| 'ready'
	| 'expired'
	| 'failed'
	| 'disabled';

export interface BrowserProfile {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly targetBaseUrl: string;
	readonly environment: string;
	readonly status: BrowserProfileStatus;
	/** Internal filesystem path — omit from public API. */
	readonly storageStatePath?: string;
	readonly createdByUserId?: string;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly lastUsedAt?: string;
	readonly expiresAt?: string;
	readonly metadata?: Record<string, unknown>;
}

export type BrowserAuthCaptureStatus =
	| 'started'
	| 'waiting_for_login'
	| 'completed'
	| 'failed'
	| 'cancelled';

export interface BrowserAuthCapture {
	readonly id: string;
	readonly sessionId: string;
	readonly runId?: string;
	readonly profileId?: string;
	readonly status: BrowserAuthCaptureStatus;
	readonly loginUrl: string;
	readonly startedAt: string;
	readonly completedAt?: string;
	readonly error?: string;
	readonly metadata?: Record<string, unknown>;
}
