import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
	selector: 'app-ops-admin',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './ops-admin.component.html',
})
export class OpsAdminComponent {
	private readonly admin = inject(AdminApiService);

	protected readonly healthJson = signal<string>('—');
	protected readonly readyJson = signal<string>('—');
	protected readonly metricsJson = signal<string>('—');
	protected readonly securityJson = signal<string>('—');
	protected readonly diag = signal<string>('');

	protected refreshAll(): void {
		this.admin.getOpsHealth().subscribe({
			next: (v) => this.healthJson.set(JSON.stringify(v, null, 2)),
			error: (e) => this.healthJson.set(JSON.stringify({ error: String((e as Error)?.message ?? e) }, null, 2)),
		});
		this.admin.getOpsReadiness().subscribe({
			next: (v) => this.readyJson.set(JSON.stringify(v, null, 2)),
			error: (e) => this.readyJson.set(JSON.stringify({ error: String((e as Error)?.message ?? e) }, null, 2)),
		});
		this.admin.getOpsMetrics().subscribe({
			next: (v) => this.metricsJson.set(JSON.stringify(v, null, 2)),
			error: (e) => this.metricsJson.set(JSON.stringify({ error: String((e as Error)?.message ?? e) }, null, 2)),
		});
		this.admin.getSecurityHealth().subscribe((v) => this.securityJson.set(JSON.stringify(v, null, 2)));
	}

	protected copyDiagnostics(): void {
		const blob = {
			health: safeParse(this.healthJson()),
			readiness: safeParse(this.readyJson()),
			metrics: safeParse(this.metricsJson()),
			securityHealth: safeParse(this.securityJson()),
			generatedAt: new Date().toISOString(),
		};
		const text = JSON.stringify(blob, null, 2);
		this.diag.set(text);
		void navigator.clipboard?.writeText?.(text);
	}
}

function safeParse(raw: string): unknown {
	if (raw === '—') return null;
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return raw;
	}
}
