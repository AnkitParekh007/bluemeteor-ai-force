import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../services/auth.store';

export function permissionGuard(...keys: string[]): CanActivateFn {
	return async () => {
		if (environment.enableMockAgents) return true;
		const auth = inject(AuthStore);
		const router = inject(Router);
		await auth.loadCurrentUser();
		for (const k of keys) {
			if (!auth.hasPermission(k)) {
				void router.navigate(['/dashboard']);
				return false;
			}
		}
		return true;
	};
}

/** User must have at least one permission (or `system.admin`). */
export function permissionGuardAny(...keys: string[]): CanActivateFn {
	return async () => {
		if (environment.enableMockAgents) return true;
		const auth = inject(AuthStore);
		const router = inject(Router);
		await auth.loadCurrentUser();
		if (!auth.hasAnyPermission(...keys)) {
			void router.navigate(['/dashboard']);
			return false;
		}
		return true;
	};
}

/**
 * For routes under `/admin`: send users to a dedicated access-denied page instead of dashboard.
 */
export function adminSectionGuard(...keys: string[]): CanActivateFn {
	return async () => {
		if (environment.enableMockAgents) return true;
		const auth = inject(AuthStore);
		const router = inject(Router);
		await auth.loadCurrentUser();
		if (!auth.hasAnyPermission(...keys)) {
			void router.navigate(['/admin', 'access-denied'], {
				queryParams: { required: keys.join(',') },
			});
			return false;
		}
		return true;
	};
}
