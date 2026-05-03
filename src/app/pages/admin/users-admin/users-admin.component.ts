import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AdminUsersPageComponent } from '../admin-users-page.component';

@Component({
	selector: 'app-users-admin',
	standalone: true,
	imports: [AdminUsersPageComponent],
	template: ` <app-admin-users-page /> `,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersAdminComponent {}
