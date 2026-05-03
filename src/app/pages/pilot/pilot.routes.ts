import type { Routes } from '@angular/router';

import { permissionGuardAny } from '../../core/guards/permission.guard';

export const pilotChildRoutes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'overview' },
	{
		path: 'overview',
		loadComponent: () =>
			import('./pilot-overview/pilot-overview.component').then((m) => m.PilotOverviewComponent),
	},
	{
		path: 'onboarding',
		loadComponent: () =>
			import('./pilot-onboarding/pilot-onboarding.component').then((m) => m.PilotOnboardingComponent),
	},
	{
		path: 'agents',
		loadComponent: () =>
			import('./pilot-agent-guides/pilot-agent-guides.component').then((m) => m.PilotAgentGuidesComponent),
	},
	{
		path: 'demo-scripts',
		loadComponent: () =>
			import('./pilot-demo-scripts/pilot-demo-scripts.component').then((m) => m.PilotDemoScriptsComponent),
	},
	{
		path: 'feedback',
		loadComponent: () =>
			import('./pilot-feedback/pilot-feedback.component').then((m) => m.PilotFeedbackComponent),
	},
	{
		path: 'metrics',
		canActivate: [permissionGuardAny('system.debug.view', 'system.admin')],
		loadComponent: () =>
			import('./pilot-success-metrics/pilot-success-metrics.component').then(
				(m) => m.PilotSuccessMetricsComponent,
			),
	},
	{
		path: 'known-limitations',
		loadComponent: () =>
			import('./pilot-known-limitations/pilot-known-limitations.component').then(
				(m) => m.PilotKnownLimitationsComponent,
			),
	},
	{
		path: 'support',
		loadComponent: () =>
			import('./pilot-support/pilot-support.component').then((m) => m.PilotSupportComponent),
	},
	{
		path: 'readiness',
		canActivate: [permissionGuardAny('system.debug.view', 'agents.readiness.view', 'system.admin')],
		loadComponent: () =>
			import('./pilot-readiness-gate/pilot-readiness-gate.component').then(
				(m) => m.PilotReadinessGateComponent,
			),
	},
];
