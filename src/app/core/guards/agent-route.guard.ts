import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../services/auth.store';

/** Ensures user has at least view access to `agents/:slug`. */
export const agentSlugGuard: CanActivateFn = async (route) => {
	if (environment.enableMockAgents) return true;
	const slug = route.paramMap.get('slug');
	const auth = inject(AuthStore);
	const router = inject(Router);
	await auth.loadCurrentUser();
	if (!slug || auth.canAccessAgent(slug, 'view')) return true;
	void router.navigate(['/agents']);
	return false;
};
