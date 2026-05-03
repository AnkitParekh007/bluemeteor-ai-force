import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';

import type { AgentEvaluationCase, AgentEvaluationRun } from '../../../core/models/agent-intelligence.models';
import { AgentIntelligenceApiService } from '../../../core/services/agent-intelligence-api.service';
import { ADMIN_PRIORITY_AGENT_SLUGS } from '../admin.constants';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

@Component({
	selector: 'app-evaluations-admin',
	standalone: true,
	imports: [CommonModule, FormsModule, Button, ConfirmDialog, Dialog, AdminSectionHeaderComponent],
	providers: [ConfirmationService],
	templateUrl: './evaluations-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationsAdminComponent implements OnInit {
	private readonly intel = inject(AgentIntelligenceApiService);
	private readonly confirm = inject(ConfirmationService);
	protected readonly slugs = [...ADMIN_PRIORITY_AGENT_SLUGS];
	protected agentSlug = 'testo';
	protected readonly cases = signal<AgentEvaluationCase[]>([]);
	protected readonly runs = signal<AgentEvaluationRun[]>([]);
	protected readonly selectedRun = signal<AgentEvaluationRun | null>(null);
	protected useRealProvider = false;

	ngOnInit(): void {
		this.load();
	}

	protected load(): void {
		this.intel.listEvaluationCases(this.agentSlug).subscribe((c) => this.cases.set(c));
		this.intel.listEvaluationRuns(this.agentSlug).subscribe((r) => this.runs.set(r));
	}

	protected runAll(): void {
		const go = () =>
			this.intel
				.runEvaluation({
					agentSlug: this.agentSlug,
					options: { useRealProvider: this.useRealProvider, allowBrowserAndTestTools: false },
				})
				.subscribe({ next: (run) => this.selectedRun.set(run) });
		if (this.useRealProvider) {
			this.confirm.confirm({
				header: 'Run with real provider?',
				message: 'This may incur cost and use live model traffic.',
				accept: () => go(),
			});
		} else go();
	}

	protected runCase(id: string): void {
		this.intel.runSingleEvaluationCase(id, { useRealProvider: this.useRealProvider }).subscribe({
			next: (run) => this.selectedRun.set(run),
		});
	}

	protected openRun(r: AgentEvaluationRun): void {
		this.intel.getEvaluationRun(r.id).subscribe({ next: (full) => this.selectedRun.set(full) });
	}
}
