import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { AgentAccessLevel, AuthUser } from '../models/auth.models';
import { AuthApiService } from './auth-api.service';
import { AuthTokenService } from './auth-token.service';

const LEVEL_RANK: Record<AgentAccessLevel, number> = {
	none: 0,
	view: 1,
	use: 2,
	act: 3,
	admin: 4,
};

@Injectable({ providedIn: 'root' })
export class AuthStore {
	private readonly api = inject(AuthApiService);
	private readonly tokens = inject(AuthTokenService);
	private readonly router = inject(Router);

	readonly user = signal<AuthUser | null>(null);
	readonly isLoading = signal(false);
	readonly error = signal<string | null>(null);

	private readonly sessionRevision = signal(0);

	readonly isAuthenticated = computed(() => {
		if (environment.enableMockAgents) return true;
		this.sessionRevision();
		this.user();
		return !!this.tokens.getAccessToken() && !!this.user();
	});

	async login(email: string, password: string): Promise<boolean> {
		this.error.set(null);
		this.isLoading.set(true);
		try {
			const res = await firstValueFrom(this.api.login(email, password));
			if (!res?.user?.id || !res?.tokens?.accessToken || !res?.tokens?.refreshToken) {
				this.error.set('Unexpected login response from server.');
				return false;
			}
			this.tokens.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
			this.sessionRevision.update((n: number) => n + 1);
			this.user.set(res.user);
			return true;
		} catch {
			this.error.set('Invalid email or password.');
			return false;
		} finally {
			this.isLoading.set(false);
		}
	}

	async loadCurrentUser(): Promise<void> {
		if (environment.enableMockAgents) return;
		const rt = this.tokens.getRefreshToken();
		const at = this.tokens.getAccessToken();
		if (!at && rt) {
			try {
				const r = await firstValueFrom(this.api.refresh(rt));
				this.tokens.setTokens(r.tokens.accessToken, r.tokens.refreshToken);
			} catch {
				this.clearAuth();
				return;
			}
		}
		if (!this.tokens.getAccessToken()) return;
		try {
			const u = await firstValueFrom(this.api.me());
			this.user.set(u);
			this.sessionRevision.update((n: number) => n + 1);
		} catch (e) {
			// Avoid wiping a fresh login on transient errors; only treat explicit 401 as logged out.
			if (e instanceof HttpErrorResponse && e.status === 401) {
				this.clearAuth();
			}
		}
	}

	async logout(): Promise<void> {
		const rt = this.tokens.getRefreshToken();
		try {
			if (rt) await firstValueFrom(this.api.logout(rt));
		} catch {
			/* ignore */
		}
		this.clearAuth();
		void this.router.navigate(['/login']);
	}

	clearAuth(): void {
		this.tokens.clear();
		this.user.set(null);
		this.error.set(null);
		this.sessionRevision.update((n: number) => n + 1);
	}

	hasPermission(key: string): boolean {
		if (environment.enableMockAgents) return true;
		const u = this.user();
		if (!u) return false;
		if (u.permissions.includes('system.admin')) return true;
		return u.permissions.includes(key);
	}

	hasRole(role: string): boolean {
		if (environment.enableMockAgents) return true;
		return this.user()?.roles.includes(role) ?? false;
	}

	canAccessAgent(agentSlug: string, min: AgentAccessLevel): boolean {
		const u = this.user();
		if (!u) return environment.enableMockAgents;
		if (u.permissions.includes('system.admin') || u.permissions.includes('agents.manage')) return true;
		const row = u.agentAccess.find((a) => a.agentSlug === agentSlug);
		if (!row) {
			return min === 'view' && u.permissions.includes('agents.view');
		}
		return LEVEL_RANK[row.accessLevel as AgentAccessLevel] >= LEVEL_RANK[min];
	}

	canUseMode(agentSlug: string, mode: 'ask' | 'plan' | 'act'): boolean {
		if (mode === 'act') return this.canAccessAgent(agentSlug, 'act');
		return this.canAccessAgent(agentSlug, 'use');
	}

	canApproveTools(): boolean {
		return this.hasPermission('tools.approve');
	}
}
