import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '../../../core/services/auth.store';

interface PilotNavLink {
	readonly label: string;
	readonly path: string;
	readonly requiresMetrics?: boolean;
	readonly requiresReadiness?: boolean;
}

@Component({
	selector: 'app-pilot-shell',
	standalone: true,
	imports: [RouterOutlet, RouterLink, RouterLinkActive],
	templateUrl: './pilot-shell.component.html',
})
export class PilotShellComponent {
	private readonly auth = inject(AuthStore);

	private readonly allLinks: readonly PilotNavLink[] = [
		{ label: 'Overview', path: 'overview' },
		{ label: 'Onboarding', path: 'onboarding' },
		{ label: 'Agent guides', path: 'agents' },
		{ label: 'Demo scripts', path: 'demo-scripts' },
		{ label: 'Feedback', path: 'feedback' },
		{ label: 'Metrics', path: 'metrics', requiresMetrics: true },
		{ label: 'Limitations', path: 'known-limitations' },
		{ label: 'Support', path: 'support' },
		{ label: 'Readiness', path: 'readiness', requiresReadiness: true },
	];

	readonly navLinks = computed(() =>
		this.allLinks.filter((l) => {
			if (l.requiresMetrics && !this.auth.hasAnyPermission('system.debug.view', 'system.admin')) {
				return false;
			}
			if (
				l.requiresReadiness &&
				!this.auth.hasAnyPermission('system.debug.view', 'agents.readiness.view', 'system.admin')
			) {
				return false;
			}
			return true;
		}),
	);
}
