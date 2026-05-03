import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { AuthStore } from '../../../core/services/auth.store';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminPermissionGateComponent } from '../components/admin-permission-gate.component';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';
import { AdminStatCardComponent } from '../components/admin-stat-card.component';
import { AdminStatusBadgeComponent } from '../components/admin-status-badge.component';

@Component({
	selector: 'app-admin-overview',
	standalone: true,
	imports: [
		CommonModule,
		AdminStatCardComponent,
		AdminSectionHeaderComponent,
		AdminPermissionGateComponent,
		AdminStatusBadgeComponent,
	],
	templateUrl: './admin-overview.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOverviewComponent implements OnInit {
	private readonly admin = inject(AdminApiService);
	protected readonly auth = inject(AuthStore);

	protected readonly summary = signal<Record<string, unknown> | null>(null);
	protected readonly summaryError = signal<string | null>(null);
	protected readonly loading = signal(false);

	readonly canSummary = () => this.auth.hasAnyPermission('system.debug.view', 'system.admin');

	ngOnInit(): void {
		if (!this.canSummary()) return;
		this.loading.set(true);
		this.admin.getAdminSummary().subscribe({
			next: (s) => {
				this.summary.set(s);
				this.loading.set(false);
			},
			error: () => {
				this.summaryError.set('Could not load platform summary.');
				this.loading.set(false);
			},
		});
	}

	protected approvalsPending(): number {
		const a = this.summary()?.['approvals'] as { pending?: number } | undefined;
		return a?.pending ?? 0;
	}

	protected recentActivity(): Array<Record<string, unknown>> {
		const r = this.summary()?.['recentActivity'];
		return Array.isArray(r) ? (r as Array<Record<string, unknown>>) : [];
	}

	protected readinessRows(): Array<Record<string, unknown>> {
		const agents = this.summary()?.['agents'] as { readiness?: unknown[] } | undefined;
		const r = agents?.readiness;
		return Array.isArray(r) ? (r as Array<Record<string, unknown>>) : [];
	}

	protected prodSafetyOk(): boolean {
		const p = this.summary()?.['productionSafety'] as { ok?: boolean } | undefined;
		return p?.ok === true;
	}

	protected evalAverageDisplay(): string {
		const v = (this.summary()?.['evaluations'] as { averageScore?: number | null } | undefined)?.averageScore;
		if (v == null || Number.isNaN(v)) return '—';
		return v.toFixed(2);
	}

	protected checkCount(row: Record<string, unknown>): number {
		const c = row['checks'];
		return Array.isArray(c) ? c.length : 0;
	}

	protected activeUsersDisplay(): string | number {
		const u = this.summary()?.['users'] as { active?: number } | undefined;
		return u?.active ?? '—';
	}

	protected readyAgentsDisplay(): string | number {
		const a = this.summary()?.['agents'] as { readyCount?: number } | undefined;
		return a?.readyCount ?? '—';
	}

	protected priorityAgentsHint(): string {
		const a = this.summary()?.['agents'] as { priorityCount?: number } | undefined;
		const n = a?.priorityCount ?? '—';
		return `Of ${n} tracked`;
	}

	protected failedRunsTodayDisplay(): string | number {
		const r = this.summary()?.['runs'] as { failedToday?: number } | undefined;
		return r?.failedToday ?? '—';
	}

	protected toolFailuresTodayDisplay(): string | number {
		const t = this.summary()?.['tools'] as { failedExecutionsToday?: number } | undefined;
		return t?.failedExecutionsToday ?? '—';
	}

	protected databaseDisplay(): string {
		const d = this.summary()?.['database'] as { ok?: boolean } | undefined;
		return d?.ok ? 'Reachable' : 'Issue';
	}

	protected prodSafetyHint(): string {
		const p = this.summary()?.['productionSafety'] as { warningCount?: number } | undefined;
		const w = p?.warningCount ?? '—';
		return `Warnings: ${w}`;
	}

	protected str(v: unknown): string {
		return v == null ? '' : String(v);
	}
}
