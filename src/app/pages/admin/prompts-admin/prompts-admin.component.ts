import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';

import type { AgentPromptTemplate, AgentPromptTemplateType } from '../../../core/models/agent-intelligence.models';
import { AgentIntelligenceApiService } from '../../../core/services/agent-intelligence-api.service';
import { AuthStore } from '../../../core/services/auth.store';
import { ADMIN_PRIORITY_AGENT_SLUGS } from '../admin.constants';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

@Component({
	selector: 'app-prompts-admin',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		Button,
		ConfirmDialog,
		Dialog,
		AdminSectionHeaderComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './prompts-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptsAdminComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly intel = inject(AgentIntelligenceApiService);
	private readonly confirm = inject(ConfirmationService);
	protected readonly auth = inject(AuthStore);

	protected readonly slugs = [...ADMIN_PRIORITY_AGENT_SLUGS];
	protected agentSlug = 'fronto';
	protected readonly rows = signal<AgentPromptTemplate[]>([]);
	protected readonly selected = signal<AgentPromptTemplate | null>(null);
	protected readonly preview = signal<string | null>(null);
	protected varsJson = JSON.stringify(
		{
			mode: 'ask',
			userMessage: 'Hello',
			toolResults: [],
			ragContext: '',
			browserContext: '',
			connectorResults: {},
		},
		null,
		2,
	);

	ngOnInit(): void {
		this.route.queryParamMap.subscribe((q) => {
			const a = q.get('agent');
			if (a && this.slugs.includes(a as (typeof ADMIN_PRIORITY_AGENT_SLUGS)[number])) {
				this.agentSlug = a;
			}
			this.load();
		});
	}

	protected load(): void {
		this.intel.listPromptTemplates(this.agentSlug).subscribe((r) => this.rows.set(r));
	}

	protected open(t: AgentPromptTemplate): void {
		this.selected.set(t);
	}

	protected close(): void {
		this.selected.set(null);
	}

	protected renderActive(): void {
		const t = this.selected();
		if (!t) return;
		let variables: Record<string, unknown> = {};
		try {
			variables = JSON.parse(this.varsJson || '{}') as Record<string, unknown>;
		} catch {
			this.preview.set('Invalid variables JSON');
			return;
		}
		this.intel
			.renderPrompt({
				agentSlug: this.agentSlug,
				templateType: t.type as AgentPromptTemplateType,
				variables,
			})
			.subscribe({
				next: (r) => this.preview.set(r.content),
				error: () => this.preview.set('Render failed'),
			});
	}

	protected activate(id: string): void {
		if (!this.auth.hasPermission('agents.manage')) return;
		this.confirm.confirm({
			header: 'Activate prompt template?',
			message: 'This changes live agent behavior for the selected type.',
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				this.intel.activatePromptTemplate(id).subscribe({ next: () => this.load() });
			},
		});
	}

	protected archive(id: string): void {
		if (!this.auth.hasPermission('agents.manage')) return;
		this.intel.archivePromptTemplate(id).subscribe({ next: () => this.load() });
	}
}
