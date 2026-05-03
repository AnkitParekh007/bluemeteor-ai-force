import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { quickChipsForSlug } from '../../../core/data/agent-quick-chips';
import { pilotSamplePromptsForAgentSlug } from '../../../core/data/pilot-sample-prompts';
import { internalAgentConfig } from '../../../core/data/internal-agent-configs';
import { MOCK_AGENTS } from '../../../core/data/mock-agents';
import type { AgentApprovalRequest } from '../../../core/models/agent-runtime.models';
import type { Agent } from '../../../core/models/agent.models';
import type {
	AgentChatMessage,
	AgentWorkspaceMode,
} from '../../../core/models/agent-session.models';
import { AgentOrchestratorClientService } from '../../../core/services/agent-orchestrator-client.service';
import { AgentSessionStore } from '../../../core/services/agent-session.store';
import { AuthStore } from '../../../core/services/auth.store';
import { environment } from '../../../../environments/environment';
import { AgentChatThreadComponent } from './components/agent-chat-thread.component';
import { AgentComposerComponent } from './components/agent-composer.component';
import { AgentSessionHeaderComponent } from './components/agent-session-header.component';
import { AgentSessionSidebarComponent } from './components/agent-session-sidebar.component';
import { AgentToolWindowComponent } from './components/agent-tool-window.component';

@Component({
	selector: 'app-agent-workspace',
	standalone: true,
	imports: [
		RouterLink,
		AgentSessionSidebarComponent,
		AgentSessionHeaderComponent,
		AgentChatThreadComponent,
		AgentComposerComponent,
		AgentToolWindowComponent,
	],
	templateUrl: './agent-workspace.component.html',
})
export class AgentWorkspaceComponent {
	private readonly route = inject(ActivatedRoute);
	protected readonly orchestrator = inject(AgentOrchestratorClientService);
	protected readonly store = inject(AgentSessionStore);
	private readonly auth = inject(AuthStore);

	private prevWorkspaceSlug: string | null = null;

	readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))), {
		initialValue: null as string | null,
	});

	readonly agent = computed((): Agent | undefined => {
		const s = this.slug();
		if (!s) return undefined;
		return MOCK_AGENTS.find((a) => a.slug === s);
	});

	readonly messages = computed((): readonly AgentChatMessage[] => this.store.activeMessages());

	readonly browserState = computed(() => {
		const id = this.store.activeSessionId();
		if (!id) return undefined;
		return this.store.browserFor(id);
	});

	readonly artifacts = computed(() => {
		const id = this.store.activeSessionId();
		if (!id) return [];
		return this.store.artifactsFor(id);
	});

	readonly consoleEntries = computed(() => {
		const id = this.store.activeSessionId();
		if (!id) return [];
		return this.store.consoleFor(id);
	});

	readonly testResults = computed(() => {
		const id = this.store.activeSessionId();
		if (!id) return [];
		return this.store.testsFor(id);
	});

	readonly runtimeEvents = computed(() => {
		const id = this.store.activeSessionId();
		if (!id) return [];
		return this.store.eventsFor(id);
	});

	readonly quickTasks = computed(() => {
		const s = this.slug();
		return s ? [...quickChipsForSlug(s)] : [];
	});

	readonly threadHints = computed(() => {
		const sug = this.store.suggestedChips();
		if (sug.length) return sug;
		const s = this.slug();
		return s ? [...quickChipsForSlug(s)] : [];
	});

	readonly composerPlaceholder = computed(() => {
		const mode = this.store.activeSession()?.mode ?? 'ask';
		const cfg = this.slug() ? internalAgentConfig(this.slug()!) : undefined;
		const name = cfg?.displayName ?? this.agent()?.name ?? 'Agent';
		if (mode === 'plan') return `Plan with ${name}… milestones, owners, verification.`;
		if (mode === 'act') return `Ask ${name} for executable drafts, artifacts, and checklists.`;
		return `Ask ${name} a question…`;
	});

	readonly modeAskDisabled = computed(() => {
		const s = this.slug();
		return !s || !this.auth.canUseMode(s, 'ask');
	});

	readonly modePlanDisabled = computed(() => {
		const s = this.slug();
		return !s || !this.auth.canUseMode(s, 'plan');
	});

	readonly modeActDisabled = computed(() => {
		const s = this.slug();
		return !s || !this.auth.canUseMode(s, 'act');
	});

	readonly mobileSessionsOpen = signal(false);
	readonly mobileToolsOpen = signal(false);
	readonly pilotSamplesOpen = signal(false);
	readonly composerDraftInject = signal<{ readonly version: number; readonly text: string } | null>(null);

	readonly pilotSampleList = computed(() => {
		const s = this.slug();
		return s ? [...pilotSamplePromptsForAgentSlug(s)] : [];
	});

	constructor() {
		effect(() => {
			const slug = this.slug();
			const ag = this.agent();
			if (!slug || !ag) return;
			if (this.prevWorkspaceSlug === slug) return;
			this.prevWorkspaceSlug = slug;
			this.store.currentSlug.set(slug);
			this.orchestrator.initializeAgentWorkspace(slug).subscribe();
		});
	}

	protected send(text: string): void {
		this.orchestrator.sendMessage(text);
		this.mobileSessionsOpen.set(false);
	}

	protected onModeChange(m: AgentWorkspaceMode): void {
		const slug = this.slug();
		if (!slug || !this.auth.canUseMode(slug, m)) return;
		const sid = this.store.activeSessionId();
		if (!sid) return;
		this.store.setMode(sid, m);
	}

	protected renameSession(): void {
		const sid = this.store.activeSessionId();
		const cur = this.store.activeSession()?.title;
		if (!sid || !cur) return;
		const next = window.prompt('Session title', cur);
		if (next?.trim()) this.store.renameSession(sid, next.trim());
	}

	protected startBrowserPreview(): void {
		this.orchestrator.openBrowserPreview();
	}

	protected openBrowserPanel(): void {
		this.store.expandToolPane('browser');
		this.mobileToolsOpen.set(true);
	}

	protected onApprove(req: AgentApprovalRequest): void {
		const runId = req.runId;
		this.orchestrator.submitApproval(runId, req.id, 'approved');
	}

	protected onReject(req: AgentApprovalRequest): void {
		const runId = req.runId;
		this.orchestrator.submitApproval(runId, req.id, 'rejected');
	}

	protected readonly env = environment;

	protected insertPilotSample(text: string): void {
		this.composerDraftInject.set({ version: Date.now(), text });
		this.pilotSamplesOpen.set(false);
	}

	protected pilotFeedbackQueryParams(): Record<string, string> {
		const s = this.slug() ?? '';
		const q: Record<string, string> = { agentSlug: s };
		const sid = this.store.activeSessionId();
		const run = this.store.activeRun();
		if (sid) q['sessionId'] = sid;
		if (run?.id) q['runId'] = run.id;
		if (run?.traceId) q['traceId'] = run.traceId;
		return q;
	}
}
