import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { BrowserAuthCapture, BrowserProfile } from '../models/browser-profile.models';

export interface AuthCaptureStartResponse {
	readonly capture: BrowserAuthCapture;
	readonly browserSession: { readonly id: string };
}

@Injectable({ providedIn: 'root' })
export class BrowserProfileApiService {
	private readonly http = inject(HttpClient);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	listProfiles(): Observable<BrowserProfile[]> {
		return this.http.get<BrowserProfile[]>(`${this.base()}/browser/profiles`);
	}

	createProfile(body: {
		name: string;
		description?: string;
		targetBaseUrl?: string;
		environment?: string;
	}): Observable<BrowserProfile> {
		return this.http.post<BrowserProfile>(`${this.base()}/browser/profiles`, body);
	}

	deleteProfile(profileId: string): Observable<{ ok: boolean }> {
		return this.http.delete<{ ok: boolean }>(`${this.base()}/browser/profiles/${encodeURIComponent(profileId)}`);
	}

	startAuthCapture(body: {
		sessionId: string;
		runId?: string;
		agentSlug: string;
		profileId?: string;
		profileName?: string;
		loginUrl?: string;
	}): Observable<AuthCaptureStartResponse> {
		return this.http.post<AuthCaptureStartResponse>(`${this.base()}/browser/auth-captures/start`, body);
	}

	completeAuthCapture(captureId: string): Observable<BrowserProfile> {
		return this.http.post<BrowserProfile>(
			`${this.base()}/browser/auth-captures/${encodeURIComponent(captureId)}/complete`,
			{},
		);
	}

	cancelAuthCapture(captureId: string): Observable<{ ok: boolean }> {
		return this.http.post<{ ok: boolean }>(
			`${this.base()}/browser/auth-captures/${encodeURIComponent(captureId)}/cancel`,
			{},
		);
	}

	getCapture(captureId: string): Observable<BrowserAuthCapture> {
		return this.http.get<BrowserAuthCapture>(
			`${this.base()}/browser/auth-captures/${encodeURIComponent(captureId)}`,
		);
	}
}
