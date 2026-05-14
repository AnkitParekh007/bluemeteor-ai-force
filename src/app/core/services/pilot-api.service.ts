import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
	MOCK_PILOT_FEEDBACK,
	MOCK_PILOT_METRICS,
	MOCK_PILOT_READINESS,
} from '../data/mock-enterprise-demo-data';
import type { PilotFeedbackPayload } from '../models/pilot.models';
import { AuthTokenService } from './auth-token.service';

export interface PilotReportResponse {
	readonly markdown: string;
	readonly data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class PilotApiService {
	private readonly http = inject(HttpClient);
	private readonly tokens = inject(AuthTokenService);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	private headers() {
		return this.tokens.getAuthHeader();
	}

	submitFeedback(body: PilotFeedbackPayload): Observable<unknown> {
		return this.http.post(`${this.base()}/pilot/feedback`, body, { headers: this.headers() });
	}

	getMetrics(): Observable<Record<string, unknown>> {
		if (environment.enableMockAgents) {
			return new Observable((subscriber) => {
				subscriber.next({ metrics: MOCK_PILOT_METRICS });
				subscriber.complete();
			});
		}
		return this.http.get<Record<string, unknown>>(`${this.base()}/pilot/metrics`, {
			headers: this.headers(),
		});
	}

	getReadiness(): Observable<Record<string, unknown>> {
		if (environment.enableMockAgents) {
			return new Observable((subscriber) => {
				subscriber.next({ checks: MOCK_PILOT_READINESS });
				subscriber.complete();
			});
		}
		return this.http.get<Record<string, unknown>>(`${this.base()}/pilot/readiness`, {
			headers: this.headers(),
		});
	}

	getReport(): Observable<PilotReportResponse> {
		if (environment.enableMockAgents) {
			return new Observable((subscriber) => {
				subscriber.next({
					markdown:
						'# Pilot Report\n\n- Readiness: warning\n- Feedback volume: healthy\n- Next action: improve recovery UX and approval auditability.',
					data: {
						metrics: MOCK_PILOT_METRICS,
						readiness: MOCK_PILOT_READINESS,
						feedback: MOCK_PILOT_FEEDBACK,
					},
				});
				subscriber.complete();
			});
		}
		return this.http.get<PilotReportResponse>(`${this.base()}/pilot/report`, { headers: this.headers() });
	}

	listFeedback(params?: {
		readonly limit?: number;
		readonly agentSlug?: string;
		readonly userRole?: string;
		readonly from?: string;
		readonly to?: string;
	}): Observable<unknown> {
		if (environment.enableMockAgents) {
			return new Observable((subscriber) => {
				subscriber.next({ items: MOCK_PILOT_FEEDBACK });
				subscriber.complete();
			});
		}
		let hp = new HttpParams();
		if (params?.limit != null) hp = hp.set('limit', String(params.limit));
		if (params?.agentSlug) hp = hp.set('agentSlug', params.agentSlug);
		if (params?.userRole) hp = hp.set('userRole', params.userRole);
		if (params?.from) hp = hp.set('from', params.from);
		if (params?.to) hp = hp.set('to', params.to);
		return this.http.get(`${this.base()}/pilot/feedback`, { headers: this.headers(), params: hp });
	}
}
