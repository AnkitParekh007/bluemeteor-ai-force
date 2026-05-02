export type PlaywrightSpecStatus = 'draft' | 'generated' | 'validated' | 'blocked' | 'ready';

export type PlaywrightRunStatus =
	| 'queued'
	| 'running'
	| 'passed'
	| 'failed'
	| 'completed'
	| 'cancelled'
	| 'blocked';

export interface PlaywrightSpec {
	readonly id: string;
	readonly sessionId: string;
	readonly runId?: string;
	readonly agentSlug: string;
	readonly title: string;
	readonly templateKey?: string;
	readonly specPath?: string;
	readonly content: string;
	readonly status: PlaywrightSpecStatus;
	readonly createdAt: string;
	readonly updatedAt?: string;
	readonly metadata?: Record<string, unknown>;
}

export interface PlaywrightTestCase {
	readonly id: string;
	readonly testRunId: string;
	readonly title: string;
	readonly status: 'passed' | 'failed' | 'skipped' | 'running';
	readonly durationMs?: number;
	readonly error?: string;
	readonly screenshotPath?: string;
	readonly createdAt: string;
}

export interface PlaywrightTestRun {
	readonly id: string;
	readonly sessionId: string;
	readonly runId?: string;
	readonly agentSlug: string;
	readonly profileId?: string;
	readonly status: PlaywrightRunStatus;
	readonly total: number;
	readonly passed: number;
	readonly failed: number;
	readonly skipped: number;
	readonly durationMs?: number;
	readonly startedAt: string;
	readonly completedAt?: string;
	readonly error?: string;
	readonly results: PlaywrightTestCase[];
	readonly reportPath?: string;
	readonly tracePath?: string;
	readonly videoPath?: string;
	readonly screenshotPath?: string;
	readonly metadata?: Record<string, unknown>;
}
