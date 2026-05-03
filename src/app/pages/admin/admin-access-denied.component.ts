import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../core/services/auth.store';

@Component({
	selector: 'app-admin-access-denied',
	standalone: true,
	imports: [RouterLink],
	template: `
		<div
			class="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-amber-200/80 bg-amber-50/90 p-8 dark:border-amber-900/50 dark:bg-amber-950/30"
		>
			<h1 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Access denied</h1>
			<p class="text-sm text-slate-700 dark:text-slate-300">
				You do not have the required permissions for this admin section. If you believe this is a mistake,
				contact a platform administrator.
			</p>
			<div class="flex flex-wrap gap-2">
				<a
					routerLink="/admin/overview"
					class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
					>Admin overview</a
				>
				<a
					routerLink="/dashboard"
					class="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
					>Dashboard</a
				>
				<button
					type="button"
					class="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
					(click)="logout()"
				>
					Sign out
				</button>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAccessDeniedComponent {
	private readonly auth = inject(AuthStore);

	protected logout(): void {
		void this.auth.logout();
	}
}
