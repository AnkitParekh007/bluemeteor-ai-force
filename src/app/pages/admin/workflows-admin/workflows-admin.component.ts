import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';

import type { AgentWorkflowTemplate } from '../../../core/models/agent-intelligence.models';
import { AgentIntelligenceApiService } from '../../../core/services/agent-intelligence-api.service';
import { AuthStore } from '../../../core/services/auth.store';
import { ADMIN_PRIORITY_AGENT_SLUGS } from '../admin.constants';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

@Component({
	selector: 'app-workflows-admin',
	standalone: true,
	imports: [CommonModule, FormsModule, Button, ConfirmDialog, Dialog, AdminSectionHeaderComponent],
	providers: [ConfirmationService],
	templateUrl: './workflows-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowsAdminComponent implements OnInit {
	private readonly intel = inject(AgentIntelligenceApiService);
	private readonly confirm = inject(ConfirmationService);
	protected readonly auth = inject(AuthStore);

	protected readonly slugs = [...ADMIN_PRIORITY_AGENT_SLUGS];
	protected agentSlug = 'fronto';
	protected readonly rows = signal<AgentWorkflowTemplate[]>([]);
	protected readonly selected = signal<AgentWorkflowTemplate | null>(null);
	protected matchPrompt = 'We need to fix the login page layout';
	protected matchMode: 'ask' | 'plan' | 'act' = 'ask';
	protected readonly matchResult = signal<AgentWorkflowTemplate | null>(null);

	ngOnInit(): void {
		this.load();
	}

	protected load(): void {
		this.intel.listWorkflows(this.agentSlug).subscribe((r) => this.rows.set(r));
	}

	protected open(w: AgentWorkflowTemplate): void {
		this.selected.set(w);
	}

	protected close(): void {
		this.selected.set(null);
	}

	protected activate(id: string): void {
		if (!this.auth.hasPermission('agents.manage')) return;
		this.confirm.confirm({
			header: 'Activate workflow?',
			message: 'Workflows still honor tool permissions and approvals.',
			accept: () => this.intel.activateWorkflow(id).subscribe({ next: () => this.load() }),
		});
	}

	protected disable(id: string): void {
		if (!this.auth.hasPermission('agents.manage')) return;
		this.intel.disableWorkflow(id).subscribe({ next: () => this.load() });
	}

	protected runMatch(): void {
		this.intel
			.matchWorkflow({
				agentSlug: this.agentSlug,
				message: this.matchPrompt,
				mode: this.matchMode,
			})
			.subscribe({ next: (w) => this.matchResult.set(w) });
	}
}
