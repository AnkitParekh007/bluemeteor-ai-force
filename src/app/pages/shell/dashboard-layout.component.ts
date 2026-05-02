import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '../../layout/header/header.component';
import { SidenavComponent } from '../../layout/sidenav/sidenav.component';

@Component({
	selector: 'app-dashboard-layout',
	standalone: true,
	imports: [HeaderComponent, SidenavComponent, RouterOutlet],
	templateUrl: './dashboard-layout.component.html',
})
export class DashboardLayoutComponent {}
