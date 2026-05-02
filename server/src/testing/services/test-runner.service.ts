import { Injectable } from '@nestjs/common';

import { isoNow } from '../../common/utils/dates';
import { newId } from '../../common/utils/ids';
import type { TestRun, TestRunResultLine } from '../models/test-run.model';

@Injectable()
export class TestRunnerService {
	private readonly byId = new Map<string, TestRun>();
	private readonly bySession = new Map<string, TestRun[]>();

	createMockTestRun(sessionId: string, runId: string, agentSlug: string, message: string): TestRun {
		const m = message.toLowerCase();
		const active = agentSlug === 'testo' || /\b(test|playwright|regression|login)\b/i.test(m);
		const results: TestRunResultLine[] = active
			? [
					{ title: 'Login page loads', status: 'passed', durationMs: 420 },
					{ title: 'Authentication validation works', status: 'passed', durationMs: 310 },
					{ title: 'Dashboard route opens', status: 'passed', durationMs: 890 },
					{ title: 'Invalid credentials error message', status: 'passed', durationMs: 240 },
					{ title: 'Supplier upload page reachable', status: 'failed', durationMs: 1200, error: 'Timeout: [data-testid="upload-confirm"]' },
				]
			: [];

		const tr: TestRun = {
			id: newId('testrun'),
			sessionId,
			runId,
			agentSlug,
			status: active ? 'completed' : 'queued',
			total: results.length,
			passed: results.filter((r) => r.status === 'passed').length,
			failed: results.filter((r) => r.status === 'failed').length,
			skipped: results.filter((r) => r.status === 'skipped').length,
			results,
			createdAt: isoNow(),
			completedAt: active ? isoNow() : undefined,
		};
		this.byId.set(tr.id, tr);
		const list = this.bySession.get(sessionId) ?? [];
		list.push(tr);
		this.bySession.set(sessionId, list);
		return tr;
	}

	listTestRuns(sessionId: string): TestRun[] {
		return [...(this.bySession.get(sessionId) ?? [])];
	}

	getTestRun(testRunId: string): TestRun | undefined {
		return this.byId.get(testRunId);
	}
}
