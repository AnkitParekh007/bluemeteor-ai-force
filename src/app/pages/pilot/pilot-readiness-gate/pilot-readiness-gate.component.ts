import { Component, inject, signal } from '@angular/core';

import type { PilotReadinessCheck } from '../../../core/models/pilot.models';
import { PilotApiService } from '../../../core/services/pilot-api.service';
import { PilotReadinessCheckComponent } from '../components/pilot-readiness-check.component';

@Component({
	selector: 'app-pilot-readiness-gate',
	standalone: true,
	imports: [PilotReadinessCheckComponent],
	templateUrl: './pilot-readiness-gate.component.html',
})
export class PilotReadinessGateComponent {
	private readonly pilot = inject(PilotApiService);

	protected readonly severities: readonly PilotReadinessCheck['severity'][] = [
		'critical',
		'high',
		'medium',
		'low',
	];

	protected readonly loading = signal(true);
	protected readonly error = signal<string | null>(null);
	protected readonly gate = signal<string>('—');
	protected readonly checks = signal<readonly PilotReadinessCheck[]>([]);
	protected readonly reportMd = signal<string | null>(null);
	protected readonly reportLoading = signal(false);

	constructor() {
		this.loadReadiness();
	}

	protected loadReadiness(): void {
		this.loading.set(true);
		this.error.set(null);
		this.pilot.getReadiness().subscribe({
			next: (r) => {
				this.gate.set(typeof r['gate'] === 'string' ? (r['gate'] as string) : '—');
				const c = r['checks'];
				this.checks.set(Array.isArray(c) ? (c as PilotReadinessCheck[]) : []);
				this.loading.set(false);
			},
			error: (e) => {
				this.error.set(String(e?.message ?? e));
				this.loading.set(false);
			},
		});
	}

	protected generateReport(): void {
		this.reportLoading.set(true);
		this.reportMd.set(null);
		this.pilot.getReport().subscribe({
			next: (rep) => {
				this.reportMd.set(rep.markdown);
				this.reportLoading.set(false);
			},
			error: (e) => {
				this.reportMd.set(`Error loading report: ${String(e?.message ?? e)}`);
				this.reportLoading.set(false);
			},
		});
	}

	protected copyReport(): void {
		const t = this.reportMd();
		if (t) void navigator.clipboard?.writeText?.(t);
	}

	protected checksBySeverity(sev: PilotReadinessCheck['severity']): readonly PilotReadinessCheck[] {
		return this.checks().filter((c) => c.severity === sev);
	}
}
