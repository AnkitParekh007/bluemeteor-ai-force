import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { CicdAnalysis, ConnectorDefinition, ConnectorHealth } from '../models/connector.models';

@Injectable({ providedIn: 'root' })
export class ConnectorApiService {
	private readonly http = inject(HttpClient);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	listConnectors(): Observable<ConnectorDefinition[]> {
		if (environment.enableMockAgents) {
			return of([]);
		}
		return this.http.get<ConnectorDefinition[]>(`${this.base()}/connectors`);
	}

	getConnectorHealth(): Observable<ConnectorHealth[]> {
		if (environment.enableMockAgents) {
			return of([]);
		}
		return this.http.get<ConnectorHealth[]>(`${this.base()}/connectors/health`);
	}

	refreshConnectorHealth(connectorId: string): Observable<ConnectorHealth> {
		if (environment.enableMockAgents) {
			return throwError(() => new Error('Connectors require live API'));
		}
		return this.http.post<ConnectorHealth>(
			`${this.base()}/connectors/${encodeURIComponent(connectorId)}/health/refresh`,
			{},
		);
	}

	repositorySearch(query: string, repoSlug?: string): Observable<unknown> {
		if (environment.enableMockAgents) {
			return of({});
		}
		const q = encodeURIComponent(query);
		const r = repoSlug ? `&repoSlug=${encodeURIComponent(repoSlug)}` : '';
		return this.http.get<unknown>(`${this.base()}/connectors/repository/search?q=${q}${r}`);
	}

	readRepositoryFile(repoSlug: string, path: string, branch?: string): Observable<unknown> {
		if (environment.enableMockAgents) {
			return of({});
		}
		const b = branch ? `&branch=${encodeURIComponent(branch)}` : '';
		return this.http.get<unknown>(
			`${this.base()}/connectors/repository/file?repoSlug=${encodeURIComponent(repoSlug)}&path=${encodeURIComponent(path)}${b}`,
		);
	}

	ticketSearch(query: string): Observable<unknown> {
		if (environment.enableMockAgents) {
			return of({});
		}
		return this.http.get<unknown>(`${this.base()}/connectors/tickets/search?q=${encodeURIComponent(query)}`);
	}

	getTicket(ticketId: string): Observable<unknown> {
		if (environment.enableMockAgents) {
			return of({});
		}
		return this.http.get<unknown>(`${this.base()}/connectors/tickets/${encodeURIComponent(ticketId)}`);
	}

	docsSearch(query: string): Observable<unknown> {
		if (environment.enableMockAgents) {
			return of({});
		}
		return this.http.get<unknown>(`${this.base()}/connectors/docs/search?q=${encodeURIComponent(query)}`);
	}

	getDoc(pageId: string): Observable<unknown> {
		if (environment.enableMockAgents) {
			return of({});
		}
		return this.http.get<unknown>(`${this.base()}/connectors/docs/${encodeURIComponent(pageId)}`);
	}

	analyzeCicd(): Observable<CicdAnalysis> {
		if (environment.enableMockAgents) {
			return throwError(() => new Error('Connectors require live API'));
		}
		return this.http.get<CicdAnalysis>(`${this.base()}/connectors/cicd/analyze`);
	}
}
