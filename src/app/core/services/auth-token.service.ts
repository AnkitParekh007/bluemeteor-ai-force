import { Injectable } from '@angular/core';

const ACCESS = 'bm_access_token';
const REFRESH = 'bm_refresh_token';

/**
 * Session-scoped token storage. TODO: move refresh token to httpOnly cookie in production.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
	getAccessToken(): string | null {
		return sessionStorage.getItem(ACCESS);
	}

	getRefreshToken(): string | null {
		return sessionStorage.getItem(REFRESH);
	}

	setTokens(access: string, refresh: string): void {
		sessionStorage.setItem(ACCESS, access);
		sessionStorage.setItem(REFRESH, refresh);
	}

	clear(): void {
		sessionStorage.removeItem(ACCESS);
		sessionStorage.removeItem(REFRESH);
	}

	getAuthHeader(): Record<string, string> {
		const t = this.getAccessToken();
		return t ? { Authorization: `Bearer ${t}` } : {};
	}
}
