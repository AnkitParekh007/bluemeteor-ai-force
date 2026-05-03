import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';

import type { AgentSkillPack } from '../../../core/models/agent-intelligence.models';
import { AgentIntelligenceApiService } from '../../../core/services/agent-intelligence-api.service';
import { AuthStore } from '../../../core/services/auth.store';
import { ADMIN_PRIORITY_AGENT_SLUGS } from '../admin.constants';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

@Component({
	selector: 'app-skill-packs-admin',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, Button, ConfirmDialog, AdminSectionHeaderComponent],
	providers: [ConfirmationService],
	templateUrl: './skill-packs-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillPacksAdminComponent implements OnInit {
	private readonly intel = inject(AgentIntelligenceApiService);
	private readonly confirm = inject(ConfirmationService);
	protected readonly auth = inject(AuthStore);

	protected readonly slugs = [...ADMIN_PRIORITY_AGENT_SLUGS];
	protected agentSlug = 'fronto';
	protected readonly rows = signal<AgentSkillPack[]>([]);

	ngOnInit(): void {
		this.load();
	}

	protected load(): void {
		this.intel.listSkillPacks(this.agentSlug).subscribe((r) => this.rows.set(r));
	}

	protected activate(id: string): void {
		if (!this.auth.hasPermission('agents.manage')) return;
		this.confirm.confirm({
			header: 'Activate skill pack?',
			message: 'This may expose additional tools subject to RBAC and denylists.',
			icon: 'pi pi-exclamation-triangle',
			accept: () => this.intel.activateSkillPack(id).subscribe({ next: () => this.load() }),
		});
	}

	protected disable(id: string): void {
		if (!this.auth.hasPermission('agents.manage')) return;
		this.intel.disableSkillPack(id).subscribe({ next: () => this.load() });
	}
}
