import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ApiErrorStateService } from '../services/api-error-state.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
	const state = inject(ApiErrorStateService);
	const base = environment.agentApiBaseUrl.replace(/\/$/, '');
	if (!req.url.startsWith(base)) {
		return next(req);
	}

	return next(req).pipe(
		tap({
			error: (err: unknown) => {
				if (!(err instanceof HttpErrorResponse)) return;
				let message = 'Something went wrong.';
				if (err.status === 0) {
					message = 'Cannot reach the agent server. Check that the API is running and the URL is correct.';
				} else if (err.status === 403) {
					message = 'You do not have permission for this action.';
				} else if (err.status === 401) {
					message = 'Session expired or not signed in.';
				} else if (err.status >= 500) {
					message = 'Server error. Try again or contact support.';
				} else if (err.error && typeof err.error === 'object' && 'message' in err.error) {
					const m = (err.error as { message?: unknown }).message;
					if (typeof m === 'string') message = m;
				}
				state.setError(err.status, message);
			},
		}),
	);
};
