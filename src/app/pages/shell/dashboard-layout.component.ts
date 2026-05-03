import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ApiErrorStateService } from '../../core/services/api-error-state.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { SidenavComponent } from '../../layout/sidenav/sidenav.component';

@Component({
	selector: 'app-dashboard-layout',
	standalone: true,
	imports: [HeaderComponent, SidenavComponent, RouterOutlet],
	templateUrl: './dashboard-layout.component.html',
})
export class DashboardLayoutComponent {
	protected readonly apiErrors = inject(ApiErrorStateService);

	protected dismissApiError(): void {
		this.apiErrors.clear();
	}
}
