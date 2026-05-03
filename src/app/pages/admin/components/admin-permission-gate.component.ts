import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { AuthStore } from '../../../core/services/auth.store';
import { AdminEmptyStateComponent } from './admin-empty-state.component';

@Component({
	selector: 'app-admin-permission-gate',
	standalone: true,
	imports: [AdminEmptyStateComponent],
	template: `
		@if (allowed()) {
			<ng-content />
		} @else {
			<app-admin-empty-state [message]="deniedMessage()" />
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPermissionGateComponent {
	private readonly auth = inject(AuthStore);

	readonly anyOf = input.required<readonly string[]>();
	readonly deniedMessage = input<string>('You do not have permission to view this section.');

	protected allowed(): boolean {
		return this.auth.hasAnyPermission(...this.anyOf());
	}
}
