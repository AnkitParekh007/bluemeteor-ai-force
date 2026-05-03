import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import type { AgentEvaluationCase, AgentEvaluationRun } from '../../../core/models/agent-intelligence.models';
import { AgentIntelligenceApiService } from '../../../core/services/agent-intelligence-api.service';

@Component({
	selector: 'app-evaluation-dashboard',
	standalone: true,
	templateUrl: './evaluation-dashboard.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationDashboardComponent {
	readonly cases = input.required<AgentEvaluationCase[]>();
	readonly runs = input.required<AgentEvaluationRun[]>();
	readonly agentSlug = input.required<string>();
	readonly runFinished = output<AgentEvaluationRun>();

	private readonly api = inject(AgentIntelligenceApiService);

	protected readonly running = signal(false);
	protected readonly lastRun = signal<AgentEvaluationRun | null>(null);

	protected runEval(): void {
		if (!confirm('Run uses the live orchestrator with evaluation safety filters. Continue?')) return;
		this.running.set(true);
		this.api
			.runEvaluation({
				agentSlug: this.agentSlug(),
				options: { allowBrowserAndTestTools: false, useRealProvider: false },
			})
			.subscribe({
				next: (r) => {
					this.lastRun.set(r);
					this.running.set(false);
					this.runFinished.emit(r);
				},
				error: () => this.running.set(false),
			});
	}

	protected latestScore(): string {
		const r = this.runs()[0];
		return r ? `${r.score} (${r.status})` : '—';
	}
}
