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
