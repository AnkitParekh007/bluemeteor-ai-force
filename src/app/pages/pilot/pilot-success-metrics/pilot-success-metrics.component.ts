import { Component, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AdminApiService } from '../../../core/services/admin-api.service';
import { OpsApiService } from '../../../core/services/ops-api.service';
import { PilotApiService } from '../../../core/services/pilot-api.service';
import { PilotMetricCardComponent } from '../components/pilot-metric-card.component';

@Component({
	selector: 'app-pilot-success-metrics',
	standalone: true,
	imports: [PilotMetricCardComponent],
	templateUrl: './pilot-success-metrics.component.html',
})
export class PilotSuccessMetricsComponent {
	private readonly pilot = inject(PilotApiService);
	private readonly admin = inject(AdminApiService);
	private readonly ops = inject(OpsApiService);

	protected readonly loading = signal(true);
	protected readonly error = signal<string | null>(null);
	protected readonly bundle = signal<Record<string, unknown> | null>(null);

	constructor() {
		this.refresh();
	}

	protected refresh(): void {
		this.loading.set(true);
		this.error.set(null);
		forkJoin({
			pilot: this.pilot.getMetrics().pipe(catchError((e) => of({ error: String(e?.message ?? e) }))),
			admin: this.admin.getAdminSummary().pipe(catchError(() => of(null))),
			approvals: this.admin.getApprovals({ status: 'pending', limit: 100 }).pipe(catchError(() => of([]))),
			opsMetrics: this.ops.getMetrics().pipe(catchError(() => of(null))),
		}).subscribe({
			next: (v) => {
				this.bundle.set(v as Record<string, unknown>);
				this.loading.set(false);
			},
			error: (e) => {
				this.error.set(String(e?.message ?? e));
				this.loading.set(false);
			},
		});
	}

	protected asAgentRows(rows: unknown): {
		readonly agentSlug: string;
		readonly count: number;
		readonly avgRating: number | null | undefined;
		readonly timeSavedMinutesSum: number | null | undefined;
	}[] {
		if (!Array.isArray(rows)) return [];
		return rows as {
			readonly agentSlug: string;
			readonly count: number;
			readonly avgRating: number | null | undefined;
			readonly timeSavedMinutesSum: number | null | undefined;
		}[];
	}

	protected asRoleRows(rows: unknown): {
		readonly userRole: string;
		readonly count: number;
		readonly avgRating: number | null | undefined;
	}[] {
		if (!Array.isArray(rows)) return [];
		return rows as {
			readonly userRole: string;
			readonly count: number;
			readonly avgRating: number | null | undefined;
		}[];
	}

	protected asSnippetList(rows: unknown): {
		readonly agentSlug: string;
		readonly userRole: string;
		readonly snippet: string;
	}[] {
		if (!Array.isArray(rows)) return [];
		return rows as {
			readonly agentSlug: string;
			readonly userRole: string;
			readonly snippet: string;
		}[];
	}

	protected approvalCount(approvals: unknown): number {
		return Array.isArray(approvals) ? approvals.length : 0;
	}

	protected adminSnippet(admin: unknown): string {
		if (!admin || typeof admin !== 'object') return '—';
		const a = admin as Record<string, unknown>;
		const keys = ['users', 'agents', 'approvals', 'runs', 'evaluations', 'tools'] as const;
		const out: Record<string, unknown> = {};
		for (const k of keys) {
			if (k in a) out[k] = a[k];
		}
		return JSON.stringify(out, null, 2);
	}

	protected stringify(x: unknown): string {
		try {
			return JSON.stringify(x, null, 2);
		} catch {
			return String(x);
		}
	}

	/** Pilot `/pilot/metrics` payload when present and not an error stub. */
	protected pilotMetrics(): Record<string, unknown> | null {
		const b = this.bundle();
		const p = b?.['pilot'];
		if (!p || typeof p !== 'object' || 'error' in p) return null;
		return p as Record<string, unknown>;
	}

	/** Error string when pilot metrics request failed; null if OK or not yet loaded. */
	protected pilotError(bundle: Record<string, unknown> | null): string | null {
		if (!bundle) return null;
		const p = bundle['pilot'];
		if (p && typeof p === 'object' && 'error' in p) return String((p as Record<string, unknown>)['error']);
		return null;
	}

	protected pilotFeedback(pilot: Record<string, unknown>): Record<string, unknown> | null {
		const fb = pilot['feedback'];
		return fb && typeof fb === 'object' ? (fb as Record<string, unknown>) : null;
	}
}
