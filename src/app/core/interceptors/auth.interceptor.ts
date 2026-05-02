import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../services/auth.store';
import { AuthTokenService } from '../services/auth-token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const tokens = inject(AuthTokenService);
	const authStore = inject(AuthStore);
	const router = inject(Router);

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
			if (err instanceof HttpErrorResponse && err.status === 401 && !environment.enableMockAgents) {
				const url = err.url ?? outgoing.url;
				// Login/refresh failures should not wipe an existing session.
				if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
					return throwError(() => err);
				}
				authStore.clearAuth();
				if (!router.url.startsWith('/login')) {
					void router.navigate(['/login']);
				}
			}
			return throwError(() => err);
		}),
	);
};
