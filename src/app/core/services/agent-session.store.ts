import { computed, Injectable, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import type { AgentArtifact } from '../models/agent-artifact.models';
import type {
	AgentApprovalRequest,
	AgentRun,
	AgentRunStatus,
	AgentRunStep,
	AgentRuntimeEvent,
	AgentToolCall,
} from '../models/agent-runtime.models';
import type {
	AgentBrowserState,
	AgentChatMessage,
	AgentActivityEvent,
	AgentConsoleEntry,
	AgentSession,
	AgentSessionStatus,
	AgentTestResult,
	AgentToolTab,
	AgentWorkspaceMode,
} from '../models/agent-session.models';

function rid(prefix: string): string {
	const r =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	return `${prefix}-${r}`;
}

function nowIso(): string {
	return new Date().toISOString();
}

const defaultBrowser = (): AgentBrowserState => ({
	isOpen: false,
	currentUrl: '',
	title: '',
	loading: false,
});

function seedSessionTitles(slug: string): [string, string, string] {
	switch (slug) {
		case 'fronto':
			return [
				'Fix dashboard layout issue',
				'Generate reusable Angular table',
				'Review accessibility issues',
			];
		case 'testo':
			return [
				'Regression test for supplier upload',
				'Create Playwright smoke suite',
				'Validate login and dashboard flow',
			];
		case 'producto':
			return [
				'Write user stories for agent workspace',
				'Prepare acceptance criteria',
				'Summarize sprint scope',
			];
		default:
			return [
				`${slug}: Discovery session`,
				`${slug}: Implementation notes`,
				`${slug}: Review & sign-off`,
			];
	}
}

/** Persisted JSON shape (see AgentSessionPersistenceService). */
export interface AgentSessionStoreSnapshot {
	readonly version: 1;
	readonly currentSlug: string;
	readonly sessions: AgentSession[];
	readonly activeSessionId: string | null;
	readonly activeRunId: string | null;
	readonly messagesBySessionId: Record<string, AgentChatMessage[]>;
	readonly artifactsBySessionId: Record<string, AgentArtifact[]>;
	readonly eventsBySessionId: Record<string, AgentRuntimeEvent[]>;
	readonly runsById: Record<string, AgentRun>;
	readonly runIdsBySessionId: Record<string, string[]>;
	readonly browserBySessionId: Record<string, AgentBrowserState>;
	readonly testResultsBySessionId: Record<string, AgentTestResult[]>;
	readonly consoleBySessionId: Record<string, AgentConsoleEntry[]>;
	readonly suggestedChips: string[];
}

@Injectable({ providedIn: 'root' })
export class AgentSessionStore {
	readonly sessions = signal<AgentSession[]>([]);
	readonly activeSessionId = signal<string | null>(null);
	readonly activeRunId = signal<string | null>(null);

	readonly messagesBySessionId = signal<Record<string, AgentChatMessage[]>>({});
	readonly sessionSidebarCollapsed = signal(false);
	readonly rightToolWindowCollapsed = signal(false);
	readonly activeToolTab = signal<AgentToolTab>('browser');
	readonly consoleBySessionId = signal<Record<string, AgentConsoleEntry[]>>({});
	readonly testResultsBySessionId = signal<Record<string, AgentTestResult[]>>({});
	/** Full artifact model (runtime-ready). */
	readonly artifactsBySessionId = signal<Record<string, AgentArtifact[]>>({});
	readonly activityBySessionId = signal<Record<string, AgentActivityEvent[]>>({});
	readonly browserBySessionId = signal<Record<string, AgentBrowserState>>({});

	readonly runsById = signal<Record<string, AgentRun>>({});
	readonly runIdsBySessionId = signal<Record<string, string[]>>({});
	readonly eventsBySessionId = signal<Record<string, AgentRuntimeEvent[]>>({});

	readonly agentThinking = signal(false);
	readonly isStreaming = signal(false);
	readonly composerError = signal<string | null>(null);
	readonly lastError = signal<string | null>(null);
	readonly suggestedChips = signal<string[]>([]);

	/** Maps run id → streaming assistant message id. */
	readonly streamingAssistantMsgByRunId = signal<Record<string, string>>({});
	readonly currentStreamingMessageId = signal<string | null>(null);

	readonly currentSlug = signal<string | null>(null);

	private readonly finalizedStreamRuns = new Set<string>();

	readonly activeSession = computed((): AgentSession | undefined => {
		const id = this.activeSessionId();
		if (!id) return undefined;
		return this.sessions().find((s) => s.id === id);
	});

	readonly activeRun = computed((): AgentRun | undefined => {
		const id = this.activeRunId();
		if (!id) return undefined;
		return this.runsById()[id];
	});

	readonly activeMessages = computed(() => {
		const sid = this.activeSessionId();
		if (!sid) return [];
		return this.messagesBySessionId()[sid] ?? [];
	});

	readonly activeArtifacts = computed(() => {
		const sid = this.activeSessionId();
		if (!sid) return [];
		return this.artifactsBySessionId()[sid] ?? [];
	});

	readonly activeEvents = computed(() => {
		const sid = this.activeSessionId();
		if (!sid) return [];
		return this.eventsBySessionId()[sid] ?? [];
	});

	readonly activeApprovals = computed((): AgentApprovalRequest[] => {
		const r = this.activeRun();
		return r?.approvals ?? [];
	});

	readonly activeToolCalls = computed((): AgentToolCall[] => {
		const r = this.activeRun();
		return r?.toolCalls ?? [];
	});

	readonly hasPendingApproval = computed(() =>
		this.activeApprovals().some((a) => a.status === 'pending'),
	);

	/** True when pending approvals are blocking the composer (strict mode). */
	readonly composerBlockedByPendingApproval = computed(() => {
		if (!environment.enableApprovalGates) return false;
		if (!environment.blockComposerWhenPendingApproval) return false;
		return this.hasPendingApproval();
	});

	readonly isAgentBusy = computed(
		() => this.agentThinking() || this.isStreaming(),
	);

	/**
	 * Send allowed when session exists, agent not busy, and not blocked by approval policy.
	 * Queue mode: set `environment.blockComposerWhenPendingApproval` to false so users can send while approvals pend.
	 */
	readonly canSendMessage = computed(() => {
		const sid = this.activeSessionId();
		if (!sid) return false;
		if (this.isAgentBusy()) return false;
		if (this.composerBlockedByPendingApproval()) return false;
		return true;
	});

	initForAgent(agentSlug: string): void {
		this.currentSlug.set(agentSlug);
		const titles = seedSessionTitles(agentSlug);
		const t = nowIso();

		const sess: AgentSession[] = titles.map((title, i) => ({
			id: rid(`sess-${i}`),
			agentSlug,
			title,
			mode: 'ask',
			status: i === 0 ? 'active' : 'idle',
			createdAt: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
			updatedAt: new Date(Date.now() - i * 3600_000).toISOString(),
			messageCount: 0,
			preview: i === 0 ? 'Ready when you are.' : `Earlier: ${title.slice(0, 42)}…`,
		}));

		const messages: Record<string, AgentChatMessage[]> = {};
		const browser: Record<string, AgentBrowserState> = {};
		const consoleMap: Record<string, AgentConsoleEntry[]> = {};
		const activityMap: Record<string, AgentActivityEvent[]> = {};
		const eventsMap: Record<string, AgentRuntimeEvent[]> = {};

		for (const s of sess) {
			messages[s.id] = [];
			browser[s.id] = defaultBrowser();
			consoleMap[s.id] = [
				{
					id: rid('log'),
					level: 'info',
					message: 'Session started',
					source: 'system',
					createdAt: t,
				},
				{
					id: rid('log'),
					level: 'success',
					message: 'Agent runtime ready',
					source: 'agent',
					createdAt: t,
				},
				{
					id: rid('log'),
					level: 'info',
					message: 'Waiting for user instruction',
					source: 'agent',
					createdAt: t,
				},
			];
			activityMap[s.id] = [
				{
					id: rid('act'),
					sessionId: s.id,
					kind: 'session',
					message: `Session "${s.title}" initialized`,
					createdAt: t,
				},
			];
			eventsMap[s.id] = [
				{
					id: rid('evt'),
					sessionId: s.id,
					agentSlug,
					type: 'session_created',
					title: 'Session initialized',
					message: s.title,
					timestamp: t,
				},
			];
		}

		this.sessions.set(sess);
		this.activeSessionId.set(sess[0]?.id ?? null);
		this.activeRunId.set(null);
		this.messagesBySessionId.set(messages);
		this.browserBySessionId.set(browser);
		this.consoleBySessionId.set(consoleMap);
		this.testResultsBySessionId.set({});
		this.artifactsBySessionId.set({});
		this.activityBySessionId.set(activityMap);
		this.eventsBySessionId.set(eventsMap);
		this.runsById.set({});
		this.runIdsBySessionId.set({});
		this.agentThinking.set(false);
		this.isStreaming.set(false);
		this.composerError.set(null);
		this.lastError.set(null);
		this.suggestedChips.set([]);
		this.activeToolTab.set('browser');
	}

	hydrateSessions(_agentSlug: string, sessions: AgentSession[]): void {
		this.sessions.set([...sessions]);
		if (!this.activeSessionId() && sessions[0]) {
			this.activeSessionId.set(sessions[0].id);
		}
	}

	/** Merge a session returned from the real API into local state. */
	ingestRemoteSession(session: AgentSession): void {
		this.sessions.update((list) => [session, ...list.filter((s) => s.id !== session.id)]);
		this.messagesBySessionId.update((m) => ({ ...m, [session.id]: m[session.id] ?? [] }));
		this.browserBySessionId.update((m) => ({
			...m,
			[session.id]: m[session.id] ?? defaultBrowser(),
		}));
		this.consoleBySessionId.update((m) => ({ ...m, [session.id]: m[session.id] ?? [] }));
		this.artifactsBySessionId.update((m) => ({ ...m, [session.id]: m[session.id] ?? [] }));
		this.eventsBySessionId.update((m) => ({ ...m, [session.id]: m[session.id] ?? [] }));
		this.selectSession(session.id);
	}

	applySnapshot(snapshot: AgentSessionStoreSnapshot): void {
		this.currentSlug.set(snapshot.currentSlug);
		this.sessions.set(snapshot.sessions);
		this.activeSessionId.set(snapshot.activeSessionId);
		this.activeRunId.set(snapshot.activeRunId);
		this.messagesBySessionId.set(snapshot.messagesBySessionId);
		this.artifactsBySessionId.set(snapshot.artifactsBySessionId);
		this.eventsBySessionId.set(snapshot.eventsBySessionId);
		this.runsById.set(snapshot.runsById);
		this.runIdsBySessionId.set(snapshot.runIdsBySessionId);
		this.browserBySessionId.set(snapshot.browserBySessionId);
		this.testResultsBySessionId.set(snapshot.testResultsBySessionId);
		this.consoleBySessionId.set(snapshot.consoleBySessionId);
		this.suggestedChips.set(snapshot.suggestedChips);
		this.activityBySessionId.set({});
	}

	buildSnapshot(): AgentSessionStoreSnapshot {
		const slug = this.currentSlug() ?? '';
		return {
			version: 1,
			currentSlug: slug,
			sessions: this.sessions(),
			activeSessionId: this.activeSessionId(),
			activeRunId: this.activeRunId(),
			messagesBySessionId: this.messagesBySessionId(),
			artifactsBySessionId: this.artifactsBySessionId(),
			eventsBySessionId: this.eventsBySessionId(),
			runsById: this.runsById(),
			runIdsBySessionId: this.runIdsBySessionId(),
			browserBySessionId: this.browserBySessionId(),
			testResultsBySessionId: this.testResultsBySessionId(),
			consoleBySessionId: this.consoleBySessionId(),
			suggestedChips: this.suggestedChips(),
		};
	}

	createSession(agentSlug: string, mode: AgentWorkspaceMode = 'ask'): AgentSession {
		const id = rid('sess');
		const t = nowIso();
		const session: AgentSession = {
			id,
			agentSlug,
			title: 'New session',
			mode,
			status: 'idle',
			createdAt: t,
			updatedAt: t,
			messageCount: 0,
			preview: 'Empty session',
		};
		this.sessions.update((list) => [session, ...list]);
		this.messagesBySessionId.update((m) => ({ ...m, [id]: [] }));
		this.browserBySessionId.update((m) => ({ ...m, [id]: defaultBrowser() }));
		this.consoleBySessionId.update((m) => ({ ...m, [id]: [] }));
		this.artifactsBySessionId.update((m) => ({ ...m, [id]: [] }));
		this.eventsBySessionId.update((m) => ({
			...m,
			[id]: [
				{
					id: rid('evt'),
					sessionId: id,
					agentSlug,
					type: 'session_created',
					title: 'New session',
					timestamp: t,
				},
			],
		}));
		this.activityBySessionId.update((m) => ({
			...m,
			[id]: [
				{
					id: rid('act'),
					sessionId: id,
					kind: 'session',
					message: 'New session created',
					createdAt: t,
				},
			],
		}));
		this.selectSession(id);
		return session;
	}

	selectSession(sessionId: string): void {
		this.activeSessionId.set(sessionId);
		this.patchSession(sessionId, { status: 'active' });
		this.activeRunId.set(null);
	}

	renameSession(sessionId: string, title: string): void {
		this.patchSession(sessionId, { title, updatedAt: nowIso() });
	}

	deleteSession(sessionId: string): void {
		const ids = this.runIdsBySessionId()[sessionId] ?? [];
		this.runsById.update((m) => {
			const next = { ...m };
			for (const rid of ids) delete next[rid];
			return next;
		});
		this.runIdsBySessionId.update((m) => {
			const { [sessionId]: _, ...rest } = m;
			return rest;
		});
		this.sessions.update((list) => list.filter((s) => s.id !== sessionId));
		this.messagesBySessionId.update((m) => {
			const { [sessionId]: _, ...rest } = m;
			return rest;
		});
		this.eventsBySessionId.update((m) => {
			const { [sessionId]: _, ...rest } = m;
			return rest;
		});
		if (this.activeSessionId() === sessionId) {
			const next = this.sessions()[0]?.id ?? null;
			this.activeSessionId.set(next);
		}
	}

	archiveSession(sessionId: string): void {
		this.patchSession(sessionId, { status: 'archived', updatedAt: nowIso() });
	}

	addMessage(sessionId: string, message: AgentChatMessage): void {
		this.messagesBySessionId.update((m) => ({
			...m,
			[sessionId]: [...(m[sessionId] ?? []), message],
		}));
		this.sessions.update((list) =>
			list.map((s) =>
				s.id === sessionId
					? {
							...s,
							messageCount: s.messageCount + 1,
							updatedAt: message.createdAt,
							preview:
								message.role === 'user'
									? message.content.slice(0, 80)
									: (s.preview ?? ''),
						}
					: s,
			),
		);
	}

	updateMessage(
		sessionId: string,
		messageId: string,
		patch: Partial<AgentChatMessage>,
	): void {
		this.messagesBySessionId.update((m) => {
			const list = m[sessionId] ?? [];
			return {
				...m,
				[sessionId]: list.map((msg) =>
					msg.id === messageId ? { ...msg, ...patch } : msg,
				),
			};
		});
	}

	updateSessionStatus(sessionId: string, status: AgentSessionStatus): void {
		this.patchSession(sessionId, { status, updatedAt: nowIso() });
	}

	setMode(sessionId: string, mode: AgentWorkspaceMode): void {
		this.patchSession(sessionId, { mode, updatedAt: nowIso() });
	}

	toggleSessionSidebar(): void {
		this.sessionSidebarCollapsed.update((v) => !v);
	}

	toggleRightToolWindow(): void {
		this.rightToolWindowCollapsed.update((v) => !v);
	}

	setActiveToolTab(tab: AgentToolTab): void {
		this.activeToolTab.set(tab);
	}

	updateBrowserState(sessionId: string, state: Partial<AgentBrowserState>): void {
		this.browserBySessionId.update((m) => ({
			...m,
			[sessionId]: { ...(m[sessionId] ?? defaultBrowser()), ...state },
		}));
	}

	addConsoleEntry(
		sessionId: string,
		entry: Omit<AgentConsoleEntry, 'id' | 'createdAt'> &
			Partial<Pick<AgentConsoleEntry, 'id' | 'createdAt'>>,
	): void {
		const full: AgentConsoleEntry = {
			id: entry.id ?? rid('log'),
			level: entry.level,
			message: entry.message,
			source: entry.source,
			createdAt: entry.createdAt ?? nowIso(),
		};
		this.consoleBySessionId.update((m) => ({
			...m,
			[sessionId]: [...(m[sessionId] ?? []), full],
		}));
	}

	setTestResults(sessionId: string, results: AgentTestResult[]): void {
		this.testResultsBySessionId.update((m) => ({ ...m, [sessionId]: results }));
	}

	addArtifact(artifact: AgentArtifact): void {
		this.artifactsBySessionId.update((m) => ({
			...m,
			[artifact.sessionId]: [...(m[artifact.sessionId] ?? []), artifact],
		}));
	}

	addActivity(
		sessionId: string,
		event: Omit<AgentActivityEvent, 'id' | 'createdAt' | 'sessionId'> &
			Partial<Pick<AgentActivityEvent, 'id' | 'createdAt'>>,
	): void {
		const full: AgentActivityEvent = {
			id: event.id ?? rid('ev'),
			sessionId,
			kind: event.kind,
			message: event.message,
			createdAt: event.createdAt ?? nowIso(),
		};
		this.activityBySessionId.update((m) => ({
			...m,
			[sessionId]: [full, ...(m[sessionId] ?? [])].slice(0, 100),
		}));
	}

	addRuntimeEvent(event: AgentRuntimeEvent): void {
		const sid = event.sessionId;
		this.eventsBySessionId.update((m) => ({
			...m,
			[sid]: [...(m[sid] ?? []), event],
		}));
	}

	addRun(run: AgentRun): void {
		this.runsById.update((m) => ({ ...m, [run.id]: run }));
		this.runIdsBySessionId.update((m) => {
			const ids = m[run.sessionId] ?? [];
			if (ids.includes(run.id)) return m;
			return { ...m, [run.sessionId]: [...ids, run.id] };
		});
		this.activeRunId.set(run.id);
	}

	updateRunStatus(runId: string, status: AgentRunStatus): void {
		this.runsById.update((m) => {
			const cur = m[runId];
			if (!cur) return m;
			return {
				...m,
				[runId]: { ...cur, status, updatedAt: nowIso() },
			};
		});
	}

	updateRun(runId: string, patch: Partial<AgentRun>): void {
		this.runsById.update((m) => {
			const cur = m[runId];
			if (!cur) return m;
			return { ...m, [runId]: { ...cur, ...patch, updatedAt: nowIso() } };
		});
	}

	addRunStep(runId: string, step: AgentRunStep): void {
		this.runsById.update((m) => {
			const cur = m[runId];
			if (!cur) return m;
			return {
				...m,
				[runId]: { ...cur, steps: [...cur.steps, step], updatedAt: nowIso() },
			};
		});
	}

	updateRunStep(runId: string, stepId: string, patch: Partial<AgentRunStep>): void {
		this.runsById.update((m) => {
			const cur = m[runId];
			if (!cur) return m;
			return {
				...m,
				[runId]: {
					...cur,
					steps: cur.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
					updatedAt: nowIso(),
				},
			};
		});
	}

	addToolCall(runId: string, toolCall: AgentToolCall): void {
		this.runsById.update((m) => {
			const cur = m[runId];
			if (!cur) return m;
			return {
				...m,
				[runId]: {
					...cur,
					toolCalls: [...cur.toolCalls, toolCall],
					updatedAt: nowIso(),
				},
			};
		});
	}

	updateToolCall(
		runId: string,
		toolCallId: string,
		patch: Partial<AgentToolCall>,
	): void {
		this.runsById.update((m) => {
			const cur = m[runId];
			if (!cur) return m;
			return {
				...m,
				[runId]: {
					...cur,
					toolCalls: cur.toolCalls.map((t) =>
						t.id === toolCallId ? { ...t, ...patch } : t,
					),
					updatedAt: nowIso(),
				},
			};
		});
	}

	addApproval(runId: string, approval: AgentApprovalRequest): void {
		this.runsById.update((m) => {
			const cur = m[runId];
			if (!cur) return m;
			return {
				...m,
				[runId]: {
					...cur,
					approvals: [...cur.approvals, approval],
					updatedAt: nowIso(),
				},
			};
		});
	}

	resolveApproval(
		runId: string,
		approvalId: string,
		status: 'approved' | 'rejected',
	): void {
		this.runsById.update((m) => {
			const cur = m[runId];
			if (!cur) return m;
			return {
				...m,
				[runId]: {
					...cur,
					approvals: cur.approvals.map((a) =>
						a.id === approvalId
							? {
									...a,
									status,
									resolvedAt: nowIso(),
								}
							: a,
					),
					updatedAt: nowIso(),
				},
			};
		});
	}

	setStreaming(value: boolean): void {
		this.isStreaming.set(value);
	}

	setLastError(error: string | null): void {
		this.lastError.set(error);
	}

	setSuggestedChips(chips: string[]): void {
		this.suggestedChips.set(chips);
	}

	setThinking(v: boolean): void {
		this.agentThinking.set(v);
	}

	/** Begin placeholder assistant message while SSE tokens append. */
	startStreamingAssistantMessage(sessionId: string, runId: string): void {
		const id = rid('agent');
		this.currentStreamingMessageId.set(id);
		this.streamingAssistantMsgByRunId.update((m) => ({ ...m, [runId]: id }));
		this.addMessage(sessionId, {
			id,
			sessionId,
			role: 'agent',
			content: '',
			createdAt: nowIso(),
			status: 'streaming',
			metadata: { runId },
		});
		this.setStreaming(true);
		this.activeRunId.set(runId);
	}

	appendStreamingToken(sessionId: string, runId: string, token: string): void {
		const msgId = this.streamingAssistantMsgByRunId()[runId];
		if (!msgId) return;
		this.messagesBySessionId.update((m) => {
			const list = m[sessionId] ?? [];
			return {
				...m,
				[sessionId]: list.map((x) =>
					x.id === msgId ? { ...x, content: x.content + token } : x,
				),
			};
		});
	}

	completeStreamingMessage(sessionId: string, runId: string): void {
		this.finalizedStreamRuns.add(runId);
		const msgId = this.streamingAssistantMsgByRunId()[runId];
		if (msgId) {
			this.updateMessage(sessionId, msgId, { status: 'done' });
		}
		this.currentStreamingMessageId.set(null);
		this.streamingAssistantMsgByRunId.update((m) => {
			const { [runId]: _, ...rest } = m;
			return rest;
		});
		this.setStreaming(false);
	}

	failStreamingMessage(sessionId: string, runId: string, error: string): void {
		this.finalizedStreamRuns.add(runId);
		const msgId = this.streamingAssistantMsgByRunId()[runId];
		if (msgId) {
			this.updateMessage(sessionId, msgId, {
				content: `Run failed: ${error}`,
				status: 'error',
			});
		}
		this.currentStreamingMessageId.set(null);
		this.streamingAssistantMsgByRunId.update((m) => {
			const { [runId]: _, ...rest } = m;
			return rest;
		});
		this.setStreaming(false);
	}

	shouldIgnoreAssistantDuplicateForRun(runId: string | undefined): boolean {
		return !!runId && this.finalizedStreamRuns.has(runId);
	}

	setSessionArtifacts(sessionId: string, artifacts: AgentArtifact[]): void {
		this.artifactsBySessionId.update((m) => ({ ...m, [sessionId]: artifacts }));
	}

	/** Replace chat history when hydrating from the API. */
	setSessionMessages(sessionId: string, messages: AgentChatMessage[]): void {
		this.messagesBySessionId.update((m) => ({ ...m, [sessionId]: messages }));
	}

	/** Replace activity timeline when hydrating from the API. */
	setSessionEvents(sessionId: string, events: AgentRuntimeEvent[]): void {
		this.eventsBySessionId.update((m) => ({ ...m, [sessionId]: events }));
	}

	setComposerError(msg: string | null): void {
		this.composerError.set(msg);
	}

	messagesFor(sessionId: string): AgentChatMessage[] {
		return this.messagesBySessionId()[sessionId] ?? [];
	}

	consoleFor(sessionId: string): AgentConsoleEntry[] {
		return this.consoleBySessionId()[sessionId] ?? [];
	}

	artifactsFor(sessionId: string): AgentArtifact[] {
		return this.artifactsBySessionId()[sessionId] ?? [];
	}

	testsFor(sessionId: string): AgentTestResult[] {
		return this.testResultsBySessionId()[sessionId] ?? [];
	}

	activityFor(sessionId: string): AgentActivityEvent[] {
		return this.activityBySessionId()[sessionId] ?? [];
	}

	eventsFor(sessionId: string): AgentRuntimeEvent[] {
		return this.eventsBySessionId()[sessionId] ?? [];
	}

	browserFor(sessionId: string): AgentBrowserState {
		return this.browserBySessionId()[sessionId] ?? defaultBrowser();
	}

	toolCallsForRun(runId: string): AgentToolCall[] {
		return this.runsById()[runId]?.toolCalls ?? [];
	}

	approvalsForRun(runId: string): AgentApprovalRequest[] {
		return this.runsById()[runId]?.approvals ?? [];
	}

	expandToolPane(tab?: AgentToolTab): void {
		this.rightToolWindowCollapsed.set(false);
		if (tab) this.activeToolTab.set(tab);
	}

	private patchSession(sessionId: string, patch: Partial<AgentSession>): void {
		this.sessions.update((list) =>
			list.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
		);
	}
}
