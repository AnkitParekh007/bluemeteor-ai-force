import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthStore } from '../../../core/services/auth.store';
import { PilotImprovementApiService } from '../../../core/services/pilot-improvement-api.service';
import type {
	AgentImprovementBacklogItem,
	BacklogStats,
	FeedbackSeverity,
	FeedbackTriageCategory,
	FeedbackTriageStatus,
	ImprovementPriority,
	ImprovementStatus,
	PilotFeedbackTriage,
	RegressionSummary,
	TriageStats,
} from '../../../core/models/pilot-improvement.models';

type View = 'overview' | 'triage' | 'backlog' | 'regression' | 'report';

const AGENT_SLUGS = ['fronto', 'backo', 'testo', 'producto', 'doco', 'dato', 'supporto', 'devopsy'] as const;

const SEVERITY_COLORS: Record<FeedbackSeverity, string> = {
	critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
	high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
	medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
	low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const STATUS_COLORS: Record<string, string> = {
	new: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
	triaged: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
	planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
	in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
	resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
	wont_fix: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
	accepted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
	rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
	implemented: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
	validated: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
	closed: 'bg-slate-100 text-slate-500',
};

const VIEW_TABS: ReadonlyArray<{ id: View; label: string }> = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'triage', label: 'Feedback queue' },
	{ id: 'backlog', label: 'Improvement backlog' },
	{ id: 'regression', label: 'Agent regression' },
	{ id: 'report', label: 'Improvement report' },
];

@Component({
	selector: 'app-pilot-improvements',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './pilot-improvements.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotImprovementsComponent implements OnInit {
	protected readonly auth = inject(AuthStore);
	private readonly api = inject(PilotImprovementApiService);

	protected readonly view = signal<View>('overview');
	protected readonly loading = signal(false);
	protected readonly actionLoading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly successMsg = signal<string | null>(null);

	// Filters
	protected readonly filterAgent = signal('');
	protected readonly filterSeverity = signal('');
	protected readonly filterCategory = signal('');
	protected readonly filterStatus = signal('');
	protected readonly filterPriority = signal('');
	protected readonly selectedRegressionAgent = signal<string>(AGENT_SLUGS[0]);

	// Data
	protected readonly triageItems = signal<PilotFeedbackTriage[]>([]);
	protected readonly triageStats = signal<TriageStats | null>(null);
	protected readonly backlogItems = signal<AgentImprovementBacklogItem[]>([]);
	protected readonly backlogStats = signal<BacklogStats | null>(null);
	protected readonly regressionSummary = signal<RegressionSummary | null>(null);
	protected readonly reportMarkdown = signal<string | null>(null);
	protected readonly selectedTriageItem = signal<PilotFeedbackTriage | null>(null);
	protected readonly selectedBacklogItem = signal<AgentImprovementBacklogItem | null>(null);

	protected readonly agentSlugs = AGENT_SLUGS;
	protected readonly severityColors = SEVERITY_COLORS;
	protected readonly statusColors = STATUS_COLORS;
	protected readonly viewTabs = VIEW_TABS;

	protected readonly overviewCards = computed(() => {
		const ts = this.triageStats();
		const bs = this.backlogStats();
		const triage = this.triageItems();

		const untriagedCount = triage.filter((t) => t.status === 'new').length;
		const highSeverityCount = triage.filter((t) =>
			['critical', 'high'].includes(t.severity) && !['resolved', 'wont_fix'].includes(t.status),
		).length;
		const openBacklog = bs?.openHighPriorityCount ?? 0;
		const implemented = bs?.byStatus.find((s) => s.status === 'implemented')?._count._all ?? 0;
		const validated = bs?.byStatus.find((s) => s.status === 'validated')?._count._all ?? 0;

		const topCategory = ts?.byCategory
			.slice()
			.sort((a, b) => b._count._all - a._count._all)[0]?.category ?? 'none';

		return [
			{ label: 'Untriaged feedback', value: untriagedCount, color: 'text-amber-600' },
			{ label: 'High severity issues', value: highSeverityCount, color: 'text-red-600' },
			{ label: 'Open high-priority backlog', value: openBacklog, color: 'text-orange-600' },
			{ label: 'Improvements implemented', value: implemented, color: 'text-emerald-600' },
			{ label: 'Improvements validated', value: validated, color: 'text-green-600' },
			{ label: 'Top issue category', value: topCategory.replace(/_/g, ' '), color: 'text-violet-600' },
		];
	});

	protected readonly filteredTriage = computed(() => {
		let items = this.triageItems();
		if (this.filterAgent()) items = items.filter((t) => t.agentSlug === this.filterAgent());
		if (this.filterSeverity()) items = items.filter((t) => t.severity === this.filterSeverity());
		if (this.filterCategory()) items = items.filter((t) => t.category === this.filterCategory());
		if (this.filterStatus()) items = items.filter((t) => t.status === this.filterStatus());
		return items;
	});

	protected readonly filteredBacklog = computed(() => {
		let items = this.backlogItems();
		if (this.filterAgent()) items = items.filter((b) => b.agentSlug === this.filterAgent());
		if (this.filterPriority()) items = items.filter((b) => b.priority === this.filterPriority());
		if (this.filterCategory()) items = items.filter((b) => b.category === this.filterCategory());
		if (this.filterStatus()) items = items.filter((b) => b.status === this.filterStatus());
		return items;
	});

	async ngOnInit() {
		await this.loadAll();
	}

	private async loadAll() {
		this.loading.set(true);
		this.error.set(null);
		try {
			const [triage, triageStats, backlog, backlogStats] = await Promise.all([
				this.api.listTriage(),
				this.api.getTriageStats(),
				this.api.listBacklog(),
				this.api.getBacklogStats(),
			]);
			this.triageItems.set(triage);
			this.triageStats.set(triageStats);
			this.backlogItems.set(backlog);
			this.backlogStats.set(backlogStats);
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Failed to load data');
		} finally {
			this.loading.set(false);
		}
	}

	protected setView(v: View) {
		this.view.set(v);
		this.selectedTriageItem.set(null);
		this.selectedBacklogItem.set(null);
		if (v === 'report' && !this.reportMarkdown()) {
			void this.loadReport();
		}
		if (v === 'regression') {
			void this.loadRegression(this.selectedRegressionAgent());
		}
	}

	protected async runTriage() {
		this.actionLoading.set(true);
		this.error.set(null);
		try {
			const result = await this.api.runTriage();
			this.successMsg.set(`Triage complete: ${result.triaged} triaged, ${result.skipped} skipped.`);
			const [triage, stats] = await Promise.all([this.api.listTriage(), this.api.getTriageStats()]);
			this.triageItems.set(triage);
			this.triageStats.set(stats);
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Triage failed');
		} finally {
			this.actionLoading.set(false);
			setTimeout(() => this.successMsg.set(null), 5000);
		}
	}

	protected async generateRecommendations() {
		this.actionLoading.set(true);
		this.error.set(null);
		try {
			const items = await this.api.generateRecommendations(this.filterAgent() || undefined);
			this.successMsg.set(`Generated ${items.length} recommendation(s).`);
			const [backlog, stats] = await Promise.all([
				this.api.listBacklog(),
				this.api.getBacklogStats(),
			]);
			this.backlogItems.set(backlog);
			this.backlogStats.set(stats);
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Recommendation generation failed');
		} finally {
			this.actionLoading.set(false);
			setTimeout(() => this.successMsg.set(null), 5000);
		}
	}

	protected selectTriageItem(item: PilotFeedbackTriage) {
		this.selectedTriageItem.set(this.selectedTriageItem()?.id === item.id ? null : item);
	}

	protected selectBacklogItem(item: AgentImprovementBacklogItem) {
		this.selectedBacklogItem.set(this.selectedBacklogItem()?.id === item.id ? null : item);
	}

	protected async updateTriageStatus(item: PilotFeedbackTriage, status: FeedbackTriageStatus) {
		this.actionLoading.set(true);
		try {
			const updated = await this.api.updateTriage(item.id, { status });
			this.triageItems.update((items) => items.map((t) => (t.id === item.id ? updated : t)));
			if (this.selectedTriageItem()?.id === item.id) this.selectedTriageItem.set(updated);
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Update failed');
		} finally {
			this.actionLoading.set(false);
		}
	}

	protected async acceptBacklogItem(item: AgentImprovementBacklogItem) {
		await this.performBacklogAction(item.id, () => this.api.acceptBacklogItem(item.id));
	}

	protected async rejectBacklogItem(item: AgentImprovementBacklogItem) {
		await this.performBacklogAction(item.id, () => this.api.rejectBacklogItem(item.id));
	}

	protected async markBacklogImplemented(item: AgentImprovementBacklogItem) {
		if (!confirm(`Mark "${item.title}" as implemented? This confirms the change was applied manually.`)) return;
		await this.performBacklogAction(item.id, () => this.api.markImplemented(item.id));
	}

	protected async markBacklogValidated(item: AgentImprovementBacklogItem) {
		if (!confirm(`Mark "${item.title}" as validated? This confirms evaluation improved after applying this change.`)) return;
		await this.performBacklogAction(item.id, () => this.api.markValidated(item.id));
	}

	protected async closeBacklogItem(item: AgentImprovementBacklogItem) {
		await this.performBacklogAction(item.id, () => this.api.closeBacklogItem(item.id));
	}

	private async performBacklogAction(
		id: string,
		action: () => Promise<AgentImprovementBacklogItem>,
	) {
		this.actionLoading.set(true);
		try {
			const updated = await action();
			this.backlogItems.update((items) => items.map((b) => (b.id === id ? updated : b)));
			if (this.selectedBacklogItem()?.id === id) this.selectedBacklogItem.set(updated);
			const stats = await this.api.getBacklogStats();
			this.backlogStats.set(stats);
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Action failed');
		} finally {
			this.actionLoading.set(false);
		}
	}

	protected async createEvalCaseFromTriage(item: PilotFeedbackTriage) {
		if (!confirm(`Create evaluation case from feedback "${item.feedbackId.slice(0, 8)}"?`)) return;
		this.actionLoading.set(true);
		try {
			await this.api.createEvaluationCaseFromFeedback(item.feedbackId);
			this.successMsg.set('Evaluation case created.');
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Failed to create evaluation case');
		} finally {
			this.actionLoading.set(false);
			setTimeout(() => this.successMsg.set(null), 5000);
		}
	}

	protected async createEvalCaseFromBacklog(item: AgentImprovementBacklogItem) {
		if (!confirm(`Create evaluation case from backlog item "${item.title}"?`)) return;
		this.actionLoading.set(true);
		try {
			await this.api.createEvaluationCaseFromBacklog(item.id);
			this.successMsg.set('Evaluation case created.');
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Failed to create evaluation case');
		} finally {
			this.actionLoading.set(false);
			setTimeout(() => this.successMsg.set(null), 5000);
		}
	}

	protected async loadRegression(agentSlug: string) {
		this.selectedRegressionAgent.set(agentSlug);
		this.loading.set(true);
		try {
			const summary = await this.api.getRegressionSummary(agentSlug);
			this.regressionSummary.set(summary);
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Failed to load regression summary');
		} finally {
			this.loading.set(false);
		}
	}

	protected async loadReport() {
		this.loading.set(true);
		try {
			const { markdown } = await this.api.getReportMarkdown();
			this.reportMarkdown.set(markdown);
		} catch (e: unknown) {
			this.error.set(e instanceof Error ? e.message : 'Failed to load report');
		} finally {
			this.loading.set(false);
		}
	}

	protected copyReport() {
		const md = this.reportMarkdown();
		if (!md) return;
		void navigator.clipboard.writeText(md);
		this.successMsg.set('Report copied to clipboard.');
		setTimeout(() => this.successMsg.set(null), 3000);
	}

	protected downloadReport() {
		const md = this.reportMarkdown();
		if (!md) return;
		const blob = new Blob([md], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `pilot-improvement-report-${new Date().toISOString().slice(0, 10)}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}

	protected severityClass(severity: FeedbackSeverity): string {
		return SEVERITY_COLORS[severity] ?? '';
	}

	protected statusClass(status: string): string {
		return STATUS_COLORS[status] ?? '';
	}

	protected formatCategory(cat: string): string {
		return cat.replace(/_/g, ' ');
	}

	protected shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString();
	}

	protected proposedChangeSummary(item: AgentImprovementBacklogItem): string {
		if (!item.proposedChangeJson) return '';
		try {
			const pc = JSON.parse(item.proposedChangeJson);
			if (pc.promptTemplatePatch) return pc.promptTemplatePatch;
			if (pc.workflowSuggestion) return String(pc.workflowSuggestion);
			if (pc.notes) return pc.notes;
		} catch {
			/* ignore */
		}
		return '';
	}

	protected scoreDeltaClass(delta: number | null): string {
		if (delta === null) return 'text-slate-500';
		if (delta > 0) return 'text-green-600';
		if (delta < 0) return 'text-red-600';
		return 'text-yellow-600';
	}
}
