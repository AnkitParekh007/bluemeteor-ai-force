import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OpsApiService {
	private readonly http = inject(HttpClient);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	getHealth(): Observable<Record<string, unknown>> {
		return this.http.get<Record<string, unknown>>(`${this.base()}/health`);
	}

	getReadiness(): Observable<Record<string, unknown>> {
		return this.http.get<Record<string, unknown>>(`${this.base()}/ready`);
	}

	getMetrics(): Observable<Record<string, unknown>> {
		return this.http.get<Record<string, unknown>>(`${this.base()}/metrics`);
	}

	getSecurityHealth(): Observable<Record<string, unknown>> {
		return this.http.get<Record<string, unknown>>(`${this.base()}/security/health`).pipe(
			catchError((e) => of({ error: String((e as { message?: string })?.message ?? e) })),
		);
	}

	getRuntimeHealth(): Observable<Record<string, unknown>> {
		return this.http.get<Record<string, unknown>>(`${this.base()}/agents/runtime/health`).pipe(
			catchError((e) => of({ error: String((e as { message?: string })?.message ?? e) })),
		);
	}

	getConnectorHealth(): Observable<unknown> {
		return this.http.get<unknown>(`${this.base()}/connectors/health`).pipe(
			catchError((e) => of({ error: String((e as { message?: string })?.message ?? e) })),
		);
	}

	getMcpHealth(): Observable<unknown> {
		return this.http.get<unknown>(`${this.base()}/mcp/health`).pipe(
			catchError((e) => of({ error: String((e as { message?: string })?.message ?? e) })),
		);
	}
}
