import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/services/auth.store';

@Component({
	selector: 'bm-security-debug',
	template: `
		<div class="wrap">
			<h1>Security debug</h1>
			<p class="muted">Diagnostics only. Raw tokens are never shown.</p>

			<section>
				<h2>Current session</h2>
				<pre>{{ userJson() }}</pre>
			</section>

			<section>
				<h2>Backend checks</h2>
				<button type="button" (click)="pingMe()">GET /auth/me</button>
				<button type="button" (click)="pingHealth()">GET /security/health</button>
				<pre>{{ apiJson() }}</pre>
			</section>
		</div>
	`,
	styles: [
		`
			.wrap {
				padding: 1.5rem;
				max-width: 960px;
			}
			.muted {
				color: var(--bm-muted, #64748b);
			}
			pre {
				background: var(--bm-surface-2, #0f172a0d);
				padding: 1rem;
				border-radius: 8px;
				overflow: auto;
				font-size: 0.85rem;
			}
			button {
				margin-right: 0.5rem;
				margin-bottom: 0.5rem;
			}
		`,
	],
})
export class SecurityDebugComponent {
	private readonly http = inject(HttpClient);
	protected readonly auth = inject(AuthStore);

	protected readonly userJson = signal<string>(
		JSON.stringify(this.auth.user(), null, 2),
	);
	protected readonly apiJson = signal<string>('—');

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	pingMe(): void {
		this.userJson.set(JSON.stringify(this.auth.user(), null, 2));
		this.http.get(`${this.base()}/auth/me`).subscribe({
			next: (v) => this.apiJson.set(JSON.stringify(v, null, 2)),
			error: (e) => this.apiJson.set(JSON.stringify({ error: String(e?.message ?? e) }, null, 2)),
		});
	}

	pingHealth(): void {
		this.http.get(`${this.base()}/security/health`).subscribe({
			next: (v) => this.apiJson.set(JSON.stringify(v, null, 2)),
			error: (e) => this.apiJson.set(JSON.stringify({ error: String(e?.message ?? e) }, null, 2)),
		});
	}
}
