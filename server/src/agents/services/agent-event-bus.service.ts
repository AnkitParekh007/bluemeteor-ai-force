import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

import type { AgentRuntimeEvent } from '../models/agent-runtime-event.model';
import { AgentEventRepository } from '../repositories/agent-event.repository';

@Injectable()
export class AgentEventBusService {
	private readonly liveByRun = new Map<string, Subject<AgentRuntimeEvent>>();

	constructor(private readonly repo: AgentEventRepository) {}

	private channel(runId: string): Subject<AgentRuntimeEvent> {
		let s = this.liveByRun.get(runId);
		if (!s) {
			s = new Subject<AgentRuntimeEvent>();
			this.liveByRun.set(runId, s);
		}
		return s;
	}

	async emit(event: AgentRuntimeEvent): Promise<void> {
		await this.repo.create(event);
		if (!event.runId) return;
		const ch = this.channel(event.runId);
		ch.next(event);
		if (event.type === 'run_completed' || event.type === 'run_failed') {
			ch.complete();
			this.liveByRun.delete(event.runId);
		}
	}

	stream(sessionId: string): Observable<AgentRuntimeEvent> {
		void sessionId;
		throw new Error('Use sseForRun(runId) for live streams');
	}

	/** SSE: replay persisted events, then live events until terminal. */
	sseForRun(runId: string): Observable<AgentRuntimeEvent> {
		return new Observable((sub) => {
			void (async () => {
				try {
					const past = await this.repo.listByRunId(runId);
					for (const e of past) {
						sub.next(e);
						if (e.type === 'run_completed' || e.type === 'run_failed') {
							sub.complete();
							return;
						}
					}
					const ch = this.channel(runId);
					const subscription = ch.subscribe((e) => {
						sub.next(e);
						if (e.type === 'run_completed' || e.type === 'run_failed') {
							subscription.unsubscribe();
							sub.complete();
						}
					});
				} catch (e) {
					sub.error(e);
				}
			})();
		});
	}

	async listEvents(sessionId: string): Promise<AgentRuntimeEvent[]> {
		return this.repo.listBySessionId(sessionId);
	}

	async clearSessionMemory(sessionId: string): Promise<void> {
		void sessionId;
	}
}
