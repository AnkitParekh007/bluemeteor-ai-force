import {
	HttpContextToken,
	HttpErrorResponse,
	HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../services/auth.store';
import { AuthApiService } from '../services/auth-api.service';
import { AuthTokenService } from '../services/auth-token.service';

/** When true, skip refresh-on-401 for this request (prevents infinite retry). */
export const AUTH_REFRESH_RETRIED = new HttpContextToken<boolean>(() => false);

let refreshChain: Promise<void> | null = null;

function refreshTokens(api: AuthApiService, tokens: AuthTokenService): Promise<void> {
	if (refreshChain) return refreshChain;
	const rt = tokens.getRefreshToken();
	if (!rt) {
		return Promise.reject(new Error('No refresh token'));
	}
	refreshChain = firstValueFrom(api.refresh(rt))
		.then((r) => {
			tokens.setTokens(r.tokens.accessToken, r.tokens.refreshToken);
		})
		.finally(() => {
			refreshChain = null;
		});
	return refreshChain;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const tokens = inject(AuthTokenService);
	const authStore = inject(AuthStore);
	const router = inject(Router);
	const authApi = inject(AuthApiService);

	const base = environment.agentApiBaseUrl.replace(/\/$/, '');
	if (!req.url.startsWith(base)) {
		return next(req);
	}

	let outgoing = req;
	const token = tokens.getAccessToken();
	if (token && !req.url.endsWith('/auth/login') && !req.url.endsWith('/auth/refresh')) {
		outgoing = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
	}

	return next(outgoing).pipe(
		catchError((err: unknown) => {
			if (!(err instanceof HttpErrorResponse)) {
				return throwError(() => err);
			}
			const url = err.url ?? outgoing.url;

			if (err.status === 403) {
				return throwError(() => err);
			}

			if (
				err.status === 401 &&
				!environment.enableMockAgents &&
				!url.includes('/auth/login') &&
				!url.includes('/auth/refresh') &&
				!outgoing.context.get(AUTH_REFRESH_RETRIED)
			) {
				const rt = tokens.getRefreshToken();
				if (!rt) {
					authStore.clearAuth();
					if (!router.url.startsWith('/login')) void router.navigate(['/login']);
					return throwError(() => err);
				}
				return from(refreshTokens(authApi, tokens)).pipe(
					switchMap(() => {
						const at = tokens.getAccessToken();
						if (!at) {
							authStore.clearAuth();
							if (!router.url.startsWith('/login')) void router.navigate(['/login']);
							return throwError(() => err);
						}
						const ctx = outgoing.context.set(AUTH_REFRESH_RETRIED, true);
						const retry = outgoing.clone({
							context: ctx,
							setHeaders: { Authorization: `Bearer ${at}` },
						});
						return next(retry);
					}),
					catchError(() => {
						authStore.clearAuth();
						if (!router.url.startsWith('/login')) void router.navigate(['/login']);
						return throwError(() => err);
					}),
				);
			}

			if (err.status === 401 && (url.includes('/auth/login') || url.includes('/auth/refresh'))) {
				return throwError(() => err);
			}

			if (err.status === 401 && !environment.enableMockAgents && url.includes('/auth/')) {
				authStore.clearAuth();
				if (!router.url.startsWith('/login')) void router.navigate(['/login']);
			}

			return throwError(() => err);
		}),
	);
};
