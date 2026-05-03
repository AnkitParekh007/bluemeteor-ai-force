import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthTokenService } from '../../core/services/auth-token.service';

@Component({
	selector: 'app-internal-tools-debug',
	standalone: true,
	imports: [JsonPipe],
	templateUrl: './internal-tools-debug.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternalToolsDebugComponent {
	private readonly http = inject(HttpClient);
	private readonly tokens = inject(AuthTokenService);

	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly health = signal<Record<string, unknown> | null>(null);
	protected readonly lastResult = signal<unknown>(null);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	private authHeaders() {
		return this.tokens.getAuthHeader();
	}

	protected refresh(): void {
		this.loading.set(true);
		this.error.set(null);
		this.http
			.get<
				Record<string, unknown>
			>(`${this.base()}/internal-tools/health`, { headers: this.authHeaders() })
			.subscribe({
				next: (h) => {
					this.health.set(h);
					this.loading.set(false);
				},
				error: (e: unknown) => {
					this.error.set(e instanceof Error ? e.message : 'Request failed');
					this.loading.set(false);
				},
			});
	}

	protected test(path: string): void {
		this.loading.set(true);
		this.error.set(null);
		this.http.get<unknown>(`${this.base()}${path}`, { headers: this.authHeaders() }).subscribe({
			next: (r) => {
				this.lastResult.set(r);
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Request failed');
				this.loading.set(false);
			},
		});
	}
}
