export type TestRunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'completed';

export interface TestRunResultLine {
	readonly title: string;
	readonly status: 'passed' | 'failed' | 'skipped' | 'running';
	readonly durationMs?: number;
	readonly error?: string;
}

export interface TestRun {
	readonly id: string;
	readonly sessionId: string;
	readonly runId: string;
	readonly agentSlug: string;
	readonly status: TestRunStatus;
	readonly total: number;
	readonly passed: number;
	readonly failed: number;
	readonly skipped: number;
	readonly results: TestRunResultLine[];
	readonly createdAt: string;
	readonly completedAt?: string;
}
