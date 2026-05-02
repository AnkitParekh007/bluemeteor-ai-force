import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import type { AgentArtifact } from '../models/agent-artifact.models';
import type { AgentChatMessage } from '../models/agent-session.models';
import type { AgentWorkspaceMode } from '../models/agent-session.models';
import type { AgentRuntimeEvent } from '../models/agent-runtime.models';
import { AgentApiService, type AgentSendResponse } from './agent-api.service';
import { AgentSessionPersistenceService } from './agent-session-persistence.service';
import { AgentSessionStore } from './agent-session.store';

function rid(prefix: string): string {
	const r =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	return `${prefix}-${r}`;
}

@Injectable({ providedIn: 'root' })
export class AgentOrchestratorClientService {
	private readonly api = inject(AgentApiService);
	private readonly store = inject(AgentSessionStore);
	private readonly persistence = inject(AgentSessionPersistenceService);

	initializeAgentWorkspace(agentSlug: string): Observable<void> {
		if (
			environment.enableMockAgents &&
			environment.enableSessionPersistence
		) {
			const snap = this.persistence.loadWorkspaceState(agentSlug);
			if (snap?.version === 1 && snap.currentSlug === agentSlug) {
				this.store.applySnapshot(snap);
				return of(undefined);
			}
		}
		if (!environment.enableMockAgents) {
			return this.api.listSessions(agentSlug).pipe(
				tap((sessions) => this.store.hydrateSessions(agentSlug, sessions)),
				switchMap((sessions) => {
					const sid = this.store.activeSessionId() ?? sessions[0]?.id;
					if (!sid) return of(undefined);
					return forkJoin({
						messages: this.api.listSessionMessages(sid).pipe(
							catchError(() => of([] as AgentChatMessage[])),
						),
						artifacts: this.api.getArtifacts(sid).pipe(
							catchError(() => of([] as AgentArtifact[])),
						),
						activity: this.api.getActivity(sid).pipe(
							catchError(() => of([] as AgentRuntimeEvent[])),
						),
					}).pipe(
						tap(({ messages, artifacts, activity }) => {
							this.store.setSessionMessages(sid, messages);
							this.store.setSessionArtifacts(sid, artifacts);
							this.store.setSessionEvents(sid, activity);
						}),
						map(() => undefined),
					);
				}),
				catchError(() => {
					this.store.initForAgent(agentSlug);
					return of(undefined);
				}),
			);
		}
		this.store.initForAgent(agentSlug);
		return of(undefined);
	}

	startNewSession(agentSlug: string, mode: AgentWorkspaceMode = 'ask'): void {
		if (!environment.enableMockAgents) {
			this.api.createSession(agentSlug, mode).subscribe({
				next: (s) => {
					this.store.ingestRemoteSession(s);
					this.persist(agentSlug);
				},
			});
			return;
		}
		this.store.createSession(agentSlug, mode);
		this.persist(agentSlug);
	}

	selectSession(sessionId: string): void {
		this.store.selectSession(sessionId);
		const slug = this.store.currentSlug();
		if (slug) {
			this.persist(slug);
			this.refreshSessionDetailFromApi(sessionId, slug);
		}
	}

	/** Load messages, artifacts, and activity for a session (live API only). */
	private refreshSessionDetailFromApi(sessionId: string, agentSlug: string): void {
		if (environment.enableMockAgents) return;
		forkJoin({
			messages: this.api.listSessionMessages(sessionId).pipe(
				catchError(() => of([] as AgentChatMessage[])),
			),
			artifacts: this.api.getArtifacts(sessionId).pipe(
				catchError(() => of([] as AgentArtifact[])),
			),
			activity: this.api.getActivity(sessionId).pipe(
				catchError(() => of([] as AgentRuntimeEvent[])),
			),
		}).subscribe({
			next: ({ messages, artifacts, activity }) => {
				this.store.setSessionMessages(sessionId, messages);
				this.store.setSessionArtifacts(sessionId, artifacts);
				this.store.setSessionEvents(sessionId, activity);
				this.persist(agentSlug);
			},
			error: () => {},
		});
	}

	sendMessage(message: string): void {
		const slug = this.store.currentSlug();
		const sid = this.store.activeSessionId();
		const mode = this.store.activeSession()?.mode ?? 'ask';
		if (!slug || !sid || !message.trim() || !this.store.canSendMessage()) return;

		const trimmed = message.trim();

		if (environment.enableAgentStreaming && environment.enableMockAgents) {
			const userMsg: AgentChatMessage = {
				id: rid('user'),
				sessionId: sid,
				role: 'user',
				content: trimmed,
				createdAt: new Date().toISOString(),
				status: 'done',
			};
			this.store.addMessage(sid, userMsg);
			this.store.updateSessionStatus(sid, 'running');
			this.store.addConsoleEntry(sid, {
				level: 'info',
				message: 'User message received (mock stream).',
				source: 'agent',
			});
			this.store.addActivity(sid, { kind: 'message', message: 'Message sent' });
			this.store.setThinking(true);
			this.store.setComposerError(null);
			this.store.setLastError(null);

			this.api
				.streamRun({
					sessionId: sid,
					agentSlug: slug,
					mode,
					message: trimmed,
				})
				.pipe(finalize(() => this.store.setThinking(false)))
				.subscribe({
					next: (ev) => this.handleRuntimeEvent(ev, slug, sid),
					error: (err: unknown) => {
						const msg =
							err instanceof Error ? err.message : 'Streaming failed.';
						this.store.setComposerError(msg);
						this.store.setLastError(msg);
						this.store.updateSessionStatus(sid, 'failed');
					},
					complete: () => {
						this.store.updateSessionStatus(sid, 'active');
						this.persist(slug);
					},
				});
			return;
		}

		if (environment.enableAgentStreaming && !environment.enableMockAgents) {
			this.sendLiveStreaming(trimmed, slug, sid, mode);
			return;
		}

		const userMsg: AgentChatMessage = {
			id: rid('user'),
			sessionId: sid,
			role: 'user',
			content: trimmed,
			createdAt: new Date().toISOString(),
			status: 'done',
		};
		this.store.addMessage(sid, userMsg);
		this.store.updateSessionStatus(sid, 'running');
		this.store.addConsoleEntry(sid, {
			level: 'info',
			message: 'User message received.',
			source: 'agent',
		});
		this.store.addActivity(sid, { kind: 'message', message: 'Message sent' });
		this.store.setThinking(true);
		this.store.setComposerError(null);
		this.store.setLastError(null);

		this.api
			.sendMessage({
				sessionId: sid,
				agentSlug: slug,
				mode,
				message: trimmed,
			})
			.pipe(finalize(() => this.store.setThinking(false)))
			.subscribe({
				next: (res: AgentSendResponse) => {
					this.applySendResponse(slug, sid, res);
					this.store.updateSessionStatus(sid, 'active');
				},
				error: (err: unknown) => {
					const msg =
						err instanceof Error ? err.message : 'Something went wrong.';
					this.store.setComposerError(msg);
					this.store.setLastError(msg);
					this.store.updateSessionStatus(sid, 'failed');
					this.store.addConsoleEntry(sid, {
						level: 'error',
						message: msg,
						source: 'system',
					});
				},
			});
	}

	private sendLiveStreaming(
		text: string,
		slug: string,
		sid: string,
		mode: AgentWorkspaceMode,
	): void {
		this.store.updateSessionStatus(sid, 'running');
		this.store.addConsoleEntry(sid, {
			level: 'info',
			message: 'Starting streamed run…',
			source: 'system',
		});
		this.store.addActivity(sid, { kind: 'message', message: 'Message sent' });
		this.store.setThinking(true);
		this.store.setComposerError(null);
		this.store.setLastError(null);

		this.api
			.startStreamingMessage({
				sessionId: sid,
				agentSlug: slug,
				mode,
				message: text,
			})
			.subscribe({
				next: (start) => {
					const userMsg: AgentChatMessage = {
						id: start.userMessageId,
						sessionId: sid,
						role: 'user',
						content: text,
						createdAt: new Date().toISOString(),
						status: 'done',
					};
					this.store.addMessage(sid, userMsg);
					this.store.startStreamingAssistantMessage(sid, start.runId);

					this.api.connectToRunEvents(start.streamUrl).subscribe({
						next: (ev) => this.handleRuntimeEvent(ev, slug, sid),
						error: (err: unknown) => {
							const msg =
								err instanceof Error ? err.message : 'Connection lost (SSE)';
							this.store.setComposerError(msg);
							this.store.setLastError(msg);
							this.store.failStreamingMessage(sid, start.runId, msg);
							this.store.updateSessionStatus(sid, 'failed');
							this.store.addConsoleEntry(sid, {
								level: 'error',
								message: msg,
								source: 'system',
							});
							this.store.setThinking(false);
						},
						complete: () => {
							this.store.setThinking(false);
							this.store.updateSessionStatus(sid, 'active');
							this.persist(slug);
						},
					});
				},
				error: (err: unknown) => {
					const msg =
						err instanceof Error ? err.message : 'Could not start streamed run.';
					this.store.setComposerError(msg);
					this.store.setLastError(msg);
					this.store.updateSessionStatus(sid, 'failed');
					this.store.setThinking(false);
					this.store.addConsoleEntry(sid, {
						level: 'error',
						message: msg,
						source: 'system',
					});
				},
			});
	}

	handleRuntimeEvent(ev: AgentRuntimeEvent, agentSlug: string, sessionId: string): void {
		const sid = ev.sessionId ?? sessionId;
		const runId = ev.runId;

		switch (ev.type) {
			case 'run_started':
				if (
					runId &&
					!this.store.streamingAssistantMsgByRunId()[runId]
				) {
					this.store.startStreamingAssistantMessage(sid, runId);
				}
				if (runId) {
					this.api.getRun(runId).subscribe({
						next: (run) => this.store.addRun(run),
						error: () => {},
					});
				}
				this.store.addRuntimeEvent(ev);
				break;
			case 'token': {
				const token =
					typeof ev.payload?.['token'] === 'string' ? ev.payload['token'] : '';
				if (token && runId) {
					this.store.appendStreamingToken(sid, runId, token);
				}
				this.store.addRuntimeEvent(ev);
				break;
			}
			case 'step_started':
			case 'step_completed':
				this.store.addRuntimeEvent(ev);
				this.store.addConsoleEntry(sid, {
					level: 'info',
					message: ev.title,
					source: 'agent',
				});
				break;
			case 'artifact_created':
				this.store.addRuntimeEvent(ev);
				this.api.getArtifacts(sid).subscribe({
					next: (arts) => this.store.setSessionArtifacts(sid, arts),
					error: () => {},
				});
				this.store.expandToolPane('artifacts');
				break;
			case 'message_created':
				if (runId && this.store.shouldIgnoreAssistantDuplicateForRun(runId)) {
					this.store.addRuntimeEvent(ev);
					break;
				}
				this.store.addRuntimeEvent(ev);
				break;
			case 'browser_opened':
			case 'browser_navigated':
				this.store.addRuntimeEvent(ev);
				this.store.updateBrowserState(sid, {
					isOpen: true,
					currentUrl: String(ev.payload?.['url'] ?? 'http://localhost:4200'),
					title: String(ev.payload?.['title'] ?? 'Browser workspace'),
					loading: false,
				});
				this.store.expandToolPane('browser');
				break;
			case 'browser_screenshot_created':
				this.store.addRuntimeEvent(ev);
				{
					const u = ev.payload?.['url'];
					if (typeof u === 'string' && u.length) {
						this.store.updateBrowserState(sid, { screenshotUrl: u, isOpen: true, loading: false });
					}
				}
				this.store.addConsoleEntry(sid, {
					level: 'success',
					message: 'Screenshot captured',
					source: 'browser',
				});
				this.store.expandToolPane('browser');
				break;
			case 'browser_dom_inspected':
			case 'browser_action_completed':
			case 'browser_action_failed':
				this.store.addRuntimeEvent(ev);
				if (ev.type === 'browser_action_failed') {
					this.store.addConsoleEntry(sid, {
						level: 'error',
						message: String(ev.payload?.['error'] ?? ev.message ?? 'Browser action failed'),
						source: 'browser',
					});
				}
				this.store.expandToolPane('browser');
				break;
			case 'test_run_started':
			case 'test_run_completed':
				this.store.addRuntimeEvent(ev);
				if (ev.type === 'test_run_completed') {
					this.store.expandToolPane('tests');
				}
				break;
			case 'tool_call_started':
			case 'tool_call_completed':
			case 'tool_call_failed':
			case 'tool_blocked':
			case 'tool_execution_waiting_for_approval':
				this.store.addRuntimeEvent(ev);
				this.store.addConsoleEntry(sid, {
					level: ev.type === 'tool_blocked' || ev.type === 'tool_call_failed' ? 'error' : 'info',
					message: ev.title || ev.type,
					source: 'tool',
				});
				if (ev.type === 'tool_call_completed') {
					this.api.getArtifacts(sid).subscribe({
						next: (arts) => this.store.setSessionArtifacts(sid, arts),
						error: () => {},
					});
				}
				break;
			case 'approval_required':
				this.store.setThinking(false);
				this.store.addRuntimeEvent(ev);
				if (runId) {
					this.api.getRun(runId).subscribe({
						next: (run) => {
							this.store.addRun(run);
							this.store.expandToolPane('approvals');
						},
						error: () => {},
					});
				}
				break;
			case 'approval_resolved':
				this.store.addRuntimeEvent(ev);
				if (runId) {
					this.api.getRun(runId).subscribe({
						next: (run) => this.store.addRun(run),
						error: () => {},
					});
				}
				break;
			case 'run_completed':
				this.store.addRuntimeEvent(ev);
				if (runId) {
					this.store.completeStreamingMessage(sid, runId);
					this.api.getRun(runId).subscribe({
						next: (run) => this.store.addRun(run),
						error: () => {},
					});
				}
				this.store.setThinking(false);
				this.store.updateSessionStatus(sid, 'active');
				this.store.addActivity(sid, { kind: 'agent', message: 'Agent replied' });
				this.persist(agentSlug);
				break;
			case 'run_failed': {
				const errMsg =
					typeof ev.payload?.['error'] === 'string'
						? ev.payload['error']
						: (ev.message ?? 'Run failed');
				this.store.addRuntimeEvent(ev);
				if (runId) {
					this.store.failStreamingMessage(sid, runId, errMsg);
				}
				this.store.updateSessionStatus(sid, 'failed');
				this.store.addConsoleEntry(sid, {
					level: 'error',
					message: errMsg,
					source: 'system',
				});
				this.store.setThinking(false);
				break;
			}
			case 'connector_call_started':
			case 'connector_call_completed':
			case 'connector_call_failed':
			case 'connector_fallback_used':
			case 'connector_disabled':
				this.store.addRuntimeEvent(ev);
				this.store.addActivity(sid, {
					kind: 'system',
					message: `[Connector] ${ev.title || ev.type}`,
				});
				this.store.addConsoleEntry(sid, {
					level: ev.type === 'connector_call_failed' ? 'error' : 'info',
					message: `${ev.title || ev.type}${ev.payload?.['connectorId'] ? ` (${String(ev.payload['connectorId'])})` : ''}`,
					source: 'tool',
				});
				this.store.expandToolPane('tools');
				if (ev.type === 'connector_call_completed') {
					this.api.getArtifacts(sid).subscribe({
						next: (arts) => this.store.setSessionArtifacts(sid, arts),
						error: () => {},
					});
				}
				break;
			case 'browser_profile_created':
			case 'browser_auth_capture_started':
			case 'browser_auth_waiting_for_login':
			case 'browser_auth_saved':
			case 'browser_profile_ready':
			case 'browser_authenticated_session_opened':
				this.store.addRuntimeEvent(ev);
				this.store.addActivity(sid, { kind: 'browser', message: ev.title });
				this.store.addConsoleEntry(sid, {
					level: 'info',
					message: ev.title,
					source: 'browser',
				});
				this.store.expandToolPane('browser');
				break;
			case 'playwright_spec_generated':
			case 'playwright_spec_validated':
				this.store.addRuntimeEvent(ev);
				this.store.addConsoleEntry(sid, {
					level: 'info',
					message: ev.title,
					source: 'tool',
				});
				this.store.expandToolPane('tests');
				break;
			case 'playwright_run_started':
			case 'playwright_test_case_completed':
			case 'playwright_run_completed':
			case 'playwright_run_failed':
				this.store.addRuntimeEvent(ev);
				this.store.addConsoleEntry(sid, {
					level: ev.type === 'playwright_run_failed' ? 'error' : 'info',
					message: ev.title,
					source: 'tool',
				});
				this.store.expandToolPane('tests');
				if (ev.type === 'playwright_run_completed') {
					this.store.expandToolPane('activity');
				}
				break;
			default:
				this.store.addRuntimeEvent(ev);
		}
	}

	sendQuickTask(prompt: string): void {
		this.sendMessage(prompt);
	}

	submitApproval(
		runId: string,
		approvalId: string,
		decision: 'approved' | 'rejected',
	): void {
		const slug = this.store.currentSlug();
		const sid = this.store.activeSessionId();
		if (!slug || !sid) return;
		this.api
			.submitApproval({ sessionId: sid, runId, approvalId, decision })
			.subscribe({
				next: () => {
					this.store.resolveApproval(runId, approvalId, decision);
					this.api.getRun(runId).subscribe({
						next: (run) => this.store.addRun(run),
						error: () => {},
					});
					this.api.getActivity(sid).subscribe({
						next: (events) => this.store.setSessionEvents(sid, events),
						error: () => {},
					});
					this.persist(slug);
				},
				error: (err: unknown) => {
					const msg =
						err instanceof Error ? err.message : 'Approval request failed.';
					this.store.setComposerError(msg);
					this.store.addConsoleEntry(sid, {
						level: 'error',
						message: msg,
						source: 'system',
					});
				},
			});
	}

	openBrowserPreview(url?: string): void {
		const sid = this.store.activeSessionId();
		if (!sid) return;
		this.store.expandToolPane('browser');
		this.store.updateBrowserState(sid, {
			isOpen: true,
			currentUrl: url ?? 'http://localhost:4200',
			title: 'Browser workspace',
			loading: false,
		});
	}

	cancelActiveRun(): void {
		const runId = this.store.activeRunId();
		if (!runId) return;
		this.store.updateRunStatus(runId, 'cancelled');
		const slug = this.store.currentSlug();
		if (slug) this.persist(slug);
	}

	private applySendResponse(
		agentSlug: string,
		sessionId: string,
		res: AgentSendResponse,
	): void {
		this.store.addRun(res.run);
		this.store.addMessage(sessionId, res.message);
		for (const a of res.artifacts) {
			this.store.addArtifact(a);
		}
		for (const e of res.events) {
			this.store.addRuntimeEvent(e);
		}
		if (res.suggestedChips?.length) {
			this.store.setSuggestedChips(res.suggestedChips);
		}
		if (res.testResults && res.testResults.length > 0) {
			this.store.setTestResults(sessionId, res.testResults);
			this.store.expandToolPane('tests');
		}
		if (res.browserPatch) {
			this.store.updateBrowserState(sessionId, res.browserPatch);
			this.store.expandToolPane('browser');
		}
		if (res.consoleLines?.length) {
			for (const line of res.consoleLines) {
				this.store.addConsoleEntry(sessionId, {
					level: line.level,
					message: line.message,
					source: line.source,
				});
			}
		}
		if (res.run.approvals.some((a) => a.status === 'pending')) {
			this.store.expandToolPane('approvals');
		} else if (res.artifacts.length) {
			this.store.expandToolPane('artifacts');
		}
		this.store.addActivity(sessionId, { kind: 'agent', message: 'Agent replied' });
		this.persist(agentSlug);
	}

	private persist(agentSlug: string): void {
		if (
			environment.enableMockAgents &&
			environment.enableSessionPersistence
		) {
			this.persistence.saveWorkspaceState(agentSlug, this.store.buildSnapshot());
		}
	}
}
