import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AgentIntelligenceApiService } from '../../core/services/agent-intelligence-api.service';
import type {
	AgentEvaluationCase,
	AgentEvaluationRun,
	AgentPromptTemplate,
	AgentSkillPack,
	AgentWorkflowTemplate,
} from '../../core/models/agent-intelligence.models';
import { EvaluationDashboardComponent } from './components/evaluation-dashboard.component';
import { PromptPreviewComponent } from './components/prompt-preview.component';
import { SkillPackListComponent } from './components/skill-pack-list.component';
import { WorkflowTemplateViewerComponent } from './components/workflow-template-viewer.component';

const SLUGS = [
	'fronto',
	'testo',
	'backo',
	'producto',
	'doco',
	'dato',
	'supporto',
	'devopsy',
] as const;

@Component({
	selector: 'app-agent-intelligence-page',
	standalone: true,
	imports: [
		FormsModule,
		PromptPreviewComponent,
		SkillPackListComponent,
		WorkflowTemplateViewerComponent,
		EvaluationDashboardComponent,
	],
	templateUrl: './agent-intelligence-page.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentIntelligencePageComponent {
	private readonly api = inject(AgentIntelligenceApiService);

	protected readonly slugs = SLUGS;
	protected readonly selectedSlug = signal<string>(SLUGS[0]);
	protected readonly prompts = signal<AgentPromptTemplate[]>([]);
	protected readonly packs = signal<AgentSkillPack[]>([]);
	protected readonly workflows = signal<AgentWorkflowTemplate[]>([]);
	protected readonly evalCases = signal<AgentEvaluationCase[]>([]);
	protected readonly runs = signal<AgentEvaluationRun[]>([]);
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly activeSystemPrompt = computed(() =>
		this.prompts().find((p) => p.type === 'system' && p.status === 'active'),
	);

	protected readonly previewVariables = signal<Record<string, unknown>>({
		agentName: 'Demo Agent',
		agentRole: 'Engineering assistant',
		mode: 'plan',
		userMessage: 'Example user request for preview.',
		ragContext: '',
		toolResults: '',
		browserContext: '',
		testResults: '',
		connectorResults: '',
	});

	constructor() {
		effect(() => {
			const slug = this.selectedSlug();
			this.load(slug);
		});
	}

	private load(slug: string): void {
		this.loading.set(true);
		this.error.set(null);
		let pending = 5;
		const done = () => {
			pending--;
			if (pending <= 0) this.loading.set(false);
		};
		const fail = (e: unknown) => {
			this.error.set(e instanceof Error ? e.message : String(e));
			done();
		};
		this.api.listPromptTemplates(slug).subscribe({
			next: (r) => {
				this.prompts.set(r);
				done();
			},
			error: fail,
		});
		this.api.listSkillPacks(slug).subscribe({
			next: (r) => {
				this.packs.set(r);
				done();
			},
			error: fail,
		});
		this.api.listWorkflows(slug).subscribe({
			next: (r) => {
				this.workflows.set(r);
				done();
			},
			error: fail,
		});
		this.api.listEvaluationCases(slug).subscribe({
			next: (r) => {
				this.evalCases.set(r);
				done();
			},
			error: fail,
		});
		this.api.listEvaluationRuns(slug).subscribe({
			next: (r) => {
				this.runs.set(r);
				done();
			},
			error: fail,
		});
	}

	protected onSlugChange(event: Event): void {
		const v = (event.target as HTMLSelectElement).value;
		if (v) this.selectedSlug.set(v);
	}

	protected refreshPreviewVars(): void {
		const slug = this.selectedSlug();
		this.previewVariables.set({
			...this.previewVariables(),
			agentName: slug,
			agentRole: `${slug} specialist`,
		});
	}

	protected onRunFinished(run: AgentEvaluationRun): void {
		this.runs.update((list) => [run, ...list.filter((x) => x.id !== run.id)]);
	}
}
