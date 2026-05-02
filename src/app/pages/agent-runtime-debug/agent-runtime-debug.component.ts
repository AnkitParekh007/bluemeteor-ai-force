import { JsonPipe } from '@angular/common';

import { HttpClient } from '@angular/common/http';

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';

import { AgentSessionStore } from '../../core/services/agent-session.store';

@Component({
	selector: 'app-agent-runtime-debug',

	standalone: true,

	imports: [JsonPipe, RouterLink],

	templateUrl: './agent-runtime-debug.component.html',

	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentRuntimeDebugComponent {
	private readonly http = inject(HttpClient);

	protected readonly store = inject(AgentSessionStore);

	protected readonly env = environment;

	protected readonly backendHealth = signal<unknown>(null);

	protected readonly runtimeHealth = signal<unknown>(null);

	protected readonly healthError = signal<string | null>(null);

	protected readonly seedResult = signal<string | null>(null);

	protected testBackendHealth(): void {
		this.healthError.set(null);

		const base = environment.agentApiBaseUrl.replace(/\/$/, '');

		this.http.get<unknown>(`${base}/health`).subscribe({
			next: (h) => this.backendHealth.set(h),

			error: (e: unknown) =>
				this.healthError.set(e instanceof Error ? e.message : 'Health request failed'),
		});

		this.http.get<unknown>(`${base}/agents/runtime/health`).subscribe({
			next: (h) => this.runtimeHealth.set(h),

			error: (e: unknown) =>
				this.healthError.set(e instanceof Error ? e.message : 'Runtime health failed'),
		});
	}

	protected seedDemoRag(): void {
		this.seedResult.set(null);

		const base = environment.agentApiBaseUrl.replace(/\/$/, '');

		this.http.post<{ ok?: boolean }>(`${base}/rag/seed-demo`, {}).subscribe({
			next: (r) => this.seedResult.set(JSON.stringify(r)),

			error: (e: unknown) =>
				this.seedResult.set(e instanceof Error ? e.message : 'Seed failed'),
		});
	}
}
