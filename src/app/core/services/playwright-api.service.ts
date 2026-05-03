import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { PlaywrightSpec, PlaywrightTestRun } from '../models/playwright-test.models';

@Injectable({ providedIn: 'root' })
export class PlaywrightApiService {
	private readonly http = inject(HttpClient);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	listRuns(sessionId: string): Observable<PlaywrightTestRun[]> {
		return this.http.get<PlaywrightTestRun[]>(
			`${this.base()}/testing/playwright/runs`,
			{ params: { sessionId } },
		);
	}

	getRun(testRunId: string): Observable<PlaywrightTestRun> {
		return this.http.get<PlaywrightTestRun>(
			`${this.base()}/testing/playwright/runs/${encodeURIComponent(testRunId)}`,
		);
	}

	listSpecs(sessionId: string): Observable<PlaywrightSpec[]> {
		return this.http.get<PlaywrightSpec[]>(`${this.base()}/testing/playwright/specs`, {
			params: { sessionId },
		});
	}

	getSpec(specId: string): Observable<PlaywrightSpec | null> {
		return this.http.get<PlaywrightSpec | null>(
			`${this.base()}/testing/playwright/specs/${encodeURIComponent(specId)}`,
		);
	}

	runTemplate(
		templateKey: string,
		body: { sessionId: string; runId?: string; agentSlug: string; profileId?: string },
	): Observable<PlaywrightTestRun> {
		return this.http.post<PlaywrightTestRun>(
			`${this.base()}/testing/playwright/templates/${encodeURIComponent(templateKey)}/run`,
			body,
		);
	}
}
