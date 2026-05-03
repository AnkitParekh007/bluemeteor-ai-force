import { Component, inject, signal } from '@angular/core';

import { OpsApiService } from '../../core/services/ops-api.service';

@Component({
	selector: 'bm-ops-dashboard',
	standalone: true,
	templateUrl: './ops-dashboard.component.html',
	styleUrl: './ops-dashboard.component.css',
})
export class OpsDashboardComponent {
	private readonly ops = inject(OpsApiService);

	protected readonly healthJson = signal<string>('—');
	protected readonly readyJson = signal<string>('—');
	protected readonly metricsJson = signal<string>('—');
	protected readonly securityJson = signal<string>('—');
	protected readonly runtimeJson = signal<string>('—');
	protected readonly connectorJson = signal<string>('—');
	protected readonly mcpJson = signal<string>('—');
	protected readonly diagnosticsJson = signal<string>('');

	protected refreshHealth(): void {
		this.ops.getHealth().subscribe({
			next: (v) => this.healthJson.set(JSON.stringify(v, null, 2)),
			error: (e) => this.healthJson.set(JSON.stringify({ error: String(e?.message ?? e) }, null, 2)),
		});
	}

	protected refreshReadiness(): void {
		this.ops.getReadiness().subscribe({
			next: (v) => this.readyJson.set(JSON.stringify(v, null, 2)),
			error: (e) => this.readyJson.set(JSON.stringify({ error: String(e?.message ?? e) }, null, 2)),
		});
	}

	protected refreshMetrics(): void {
		this.ops.getMetrics().subscribe({
			next: (v) => this.metricsJson.set(JSON.stringify(v, null, 2)),
			error: (e) => this.metricsJson.set(JSON.stringify({ error: String(e?.message ?? e) }, null, 2)),
		});
	}

	protected refreshSecurity(): void {
		this.ops.getSecurityHealth().subscribe((v) => this.securityJson.set(JSON.stringify(v, null, 2)));
	}

	protected refreshRuntime(): void {
		this.ops.getRuntimeHealth().subscribe((v) => this.runtimeJson.set(JSON.stringify(v, null, 2)));
	}

	protected refreshConnectors(): void {
		this.ops.getConnectorHealth().subscribe((v) => this.connectorJson.set(JSON.stringify(v, null, 2)));
	}

	protected refreshMcp(): void {
		this.ops.getMcpHealth().subscribe((v) => this.mcpJson.set(JSON.stringify(v, null, 2)));
	}

	protected refreshAll(): void {
		this.refreshHealth();
		this.refreshReadiness();
		this.refreshMetrics();
		this.refreshSecurity();
		this.refreshRuntime();
		this.refreshConnectors();
		this.refreshMcp();
	}

	protected copyDiagnostics(): void {
		const blob = {
			health: safeParse(this.healthJson()),
			readiness: safeParse(this.readyJson()),
			metrics: safeParse(this.metricsJson()),
			securityHealth: safeParse(this.securityJson()),
			runtimeHealth: safeParse(this.runtimeJson()),
			connectors: safeParse(this.connectorJson()),
			mcp: safeParse(this.mcpJson()),
			generatedAt: new Date().toISOString(),
		};
		const text = JSON.stringify(blob, null, 2);
		this.diagnosticsJson.set(text);
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
