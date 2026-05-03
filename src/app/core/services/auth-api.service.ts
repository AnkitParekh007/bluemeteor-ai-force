import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { AuthUser } from '../models/auth.models';
import type { AuthTokens } from '../models/auth.models';
import { AuthTokenService } from './auth-token.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
	private readonly http = inject(HttpClient);
	private readonly tokens = inject(AuthTokenService);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	login(email: string, password: string): Observable<{ user: AuthUser; tokens: AuthTokens }> {
		return this.http.post<{ user: AuthUser; tokens: AuthTokens }>(`${this.base()}/auth/login`, {
			email,
			password,
		});
	}

	refresh(refreshToken: string): Observable<{ tokens: AuthTokens }> {
		return this.http.post<{ tokens: AuthTokens }>(`${this.base()}/auth/refresh`, { refreshToken });
	}

	logout(refreshToken?: string): Observable<void> {
		const headers = this.tokens.getAuthHeader();
		return this.http.post<void>(
			`${this.base()}/auth/logout`,
			{ refreshToken },
			{ headers },
		);
	}

	me(): Observable<AuthUser> {
		return this.http.get<AuthUser>(`${this.base()}/auth/me`, {
			headers: this.tokens.getAuthHeader(),
		});
	}

	permissions(): Observable<{ permissions: string[]; agentAccess: AuthUser['agentAccess']; roles: string[] }> {
		return this.http.get(`${this.base()}/auth/permissions`, {
			headers: this.tokens.getAuthHeader(),
		}) as Observable<{ permissions: string[]; agentAccess: AuthUser['agentAccess']; roles: string[] }>;
	}

	listRoles(): Observable<Array<{ id: string; key: string; name: string; description: string | null }>> {
		return this.http.get(`${this.base()}/auth/roles`, { headers: this.tokens.getAuthHeader() }) as Observable<
			Array<{ id: string; key: string; name: string; description: string | null }>
		>;
	}

	createUser(body: {
		email: string;
		password: string;
		name: string;
		department?: string;
		jobTitle?: string;
		roleKey?: string;
	}): Observable<{ id: string }> {
		return this.http.post<{ id: string }>(`${this.base()}/auth/users`, body, {
			headers: this.tokens.getAuthHeader(),
		});
	}

	updateUser(
		userId: string,
		body: { name?: string; department?: string; jobTitle?: string; status?: string },
	): Observable<void> {
		return this.http.patch<void>(`${this.base()}/auth/users/${encodeURIComponent(userId)}`, body, {
			headers: this.tokens.getAuthHeader(),
		});
	}

	disableUser(userId: string): Observable<void> {
		return this.http.post<void>(
			`${this.base()}/auth/users/${encodeURIComponent(userId)}/disable`,
			{},
			{ headers: this.tokens.getAuthHeader() },
		);
	}

	listUsers(): Observable<
		Array<{
			id: string;
			email: string;
			name: string;
			status: string;
			department: string | null;
			jobTitle: string | null;
			createdAt: string;
			lastLoginAt?: string | null;
			userRoles: Array<{ role: { key: string; name: string } }>;
		}>
	> {
		return this.http.get(`${this.base()}/auth/users`, { headers: this.tokens.getAuthHeader() }) as Observable<
			Array<{
				id: string;
				email: string;
				name: string;
				status: string;
				department: string | null;
				jobTitle: string | null;
				createdAt: string;
				lastLoginAt?: string | null;
				userRoles: Array<{ role: { key: string; name: string } }>;
			}>
		>;
	}

	listAuditLogs(
		limit = 200,
		filters?: {
			readonly action?: string;
			readonly agentSlug?: string;
			readonly runId?: string;
			readonly actorEmail?: string;
		},
	): Observable<
		Array<{
			id: string;
			action: string;
			actorUserId?: string;
			actorEmail?: string;
			agentSlug?: string;
			sessionId?: string;
			runId?: string;
			details?: Record<string, unknown>;
			createdAt: string;
		}>
	> {
		const q = new URLSearchParams();
		q.set('limit', String(Math.min(500, Math.max(1, limit))));
		if (filters?.action) q.set('action', filters.action);
		if (filters?.agentSlug) q.set('agentSlug', filters.agentSlug);
		if (filters?.runId) q.set('runId', filters.runId);
		if (filters?.actorEmail) q.set('actorEmail', filters.actorEmail);
		return this.http.get(`${this.base()}/audit/logs?${q}`, {
			headers: this.tokens.getAuthHeader(),
		}) as Observable<
			Array<{
				id: string;
				action: string;
				actorUserId?: string;
				actorEmail?: string;
				agentSlug?: string;
				sessionId?: string;
				runId?: string;
				details?: Record<string, unknown>;
				createdAt: string;
			}>
		>;
	}
}
