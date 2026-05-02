import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../services/auth.store';

export const authGuard: CanActivateFn = async () => {
	if (environment.enableMockAgents) return true;
	const auth = inject(AuthStore);
	const router = inject(Router);
	await auth.loadCurrentUser();
	if (auth.isAuthenticated()) return true;
	void router.navigate(['/login']);
	return false;
};

export const loginRedirectGuard: CanActivateFn = async () => {
	if (environment.enableMockAgents) return true;
	const auth = inject(AuthStore);
	const router = inject(Router);
	await auth.loadCurrentUser();
	if (auth.isAuthenticated()) {
		void router.navigate(['/dashboard']);
		return false;
	}
	return true;
};
