import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { INTERNAL_AGENT_CONFIGS } from '../../../core/data/internal-agent-configs';
import type { InternalAgentConfig } from '../../../core/models/internal-agent-config.models';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminRiskBadgeComponent } from '../components/admin-risk-badge.component';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';
import { ADMIN_PRIORITY_AGENT_SLUGS } from '../admin.constants';

@Component({
	selector: 'app-agents-admin',
	standalone: true,
	imports: [CommonModule, RouterLink, Button, Dialog, AdminSectionHeaderComponent, AdminRiskBadgeComponent],
	templateUrl: './agents-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentsAdminComponent implements OnInit {
	private readonly admin = inject(AdminApiService);

	protected readonly rows = signal<
		Array<{
			slug: string;
			displayName: string;
			department: string | null;
			defaultMode: string | null;
			readinessScore: number;
			allowedToolsCount: number;
			deniedToolsCount: number;
			knowledgeSourcesCount: number;
			requiresApprovalRules: number;
		}>
	>([]);
	protected readonly error = signal<string | null>(null);
	protected readonly loading = signal(false);
	protected readonly detailSlug = signal<string | null>(null);

	ngOnInit(): void {
		this.loading.set(true);
		this.admin.getAgentsAdminSummary().subscribe({
			next: (body) => {
				const agents = body['agents'] as Array<Record<string, unknown>> | undefined;
				const list = Array.isArray(agents) ? agents : [];
				const bySlug = new Map(list.map((a) => [String(a['slug']), a]));
				const ordered = ADMIN_PRIORITY_AGENT_SLUGS.map((slug) => {
					const a = bySlug.get(slug);
					if (!a) {
						return {
							slug,
							displayName: slug,
							department: null,
							defaultMode: null,
							readinessScore: 0,
							allowedToolsCount: 0,
							deniedToolsCount: 0,
							knowledgeSourcesCount: 0,
							requiresApprovalRules: 0,
						};
					}
					return {
						slug: String(a['slug']),
						displayName: String(a['displayName'] ?? slug),
						department: (a['department'] as string | null) ?? null,
						defaultMode: (a['defaultMode'] as string | null) ?? null,
						readinessScore: Number(a['readinessScore'] ?? 0),
						allowedToolsCount: Number(a['allowedToolsCount'] ?? 0),
						deniedToolsCount: Number(a['deniedToolsCount'] ?? 0),
						knowledgeSourcesCount: Number(a['knowledgeSourcesCount'] ?? 0),
						requiresApprovalRules: Number(a['requiresApprovalRules'] ?? 0),
					};
				});
				this.rows.set(ordered);
				this.loading.set(false);
			},
			error: () => {
				this.error.set('Could not load agent summary.');
				this.loading.set(false);
			},
		});
	}

	protected configFor(slug: string): InternalAgentConfig | undefined {
		return INTERNAL_AGENT_CONFIGS[slug];
	}

	protected openDetail(slug: string): void {
		this.detailSlug.set(slug);
	}

	protected closeDetail(): void {
		this.detailSlug.set(null);
	}

	protected scoreBand(score: number): 'ok' | 'warn' | 'bad' {
		if (score >= 80) return 'ok';
		if (score >= 60) return 'warn';
		return 'bad';
	}
}
