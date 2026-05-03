import { Routes } from '@angular/router';

import { agentFeatureRoutes } from './pages/agents/agents.routes';
import { adminShellRoute } from './pages/admin/admin.routes';
import { pilotChildRoutes } from './pages/pilot/pilot.routes';
import { authGuard, loginRedirectGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{
		path: 'login',
		canActivate: [loginRedirectGuard],
		loadComponent: () =>
			import('./pages/login/login.component').then((m) => m.LoginComponent),
	},

	// Shell layout (pages/shell); dashboard home content lives in pages/dashboard
	{
		path: 'dashboard',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/dashboard/dashboard-home.component').then(
						(m) => m.DashboardHomeComponent,
					),
			},
		],
	},
	{
		path: 'agents',
		canActivate: [authGuard, permissionGuard('agents.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/agents/agents-page.component').then(
						(m) => m.AgentsPageComponent,
					),
			},
			...agentFeatureRoutes,
		],
	},
	{
		path: 'logs',
		canActivate: [authGuard, permissionGuard('audit.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/logs/logs-page.component').then(
						(m) => m.LogsPageComponent,
					),
			},
		],
	},
	{
		path: 'settings',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/settings/settings-page.component').then(
						(m) => m.SettingsPageComponent,
					),
			},
		],
	},
	{
		path: 'pilot',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/pilot/pilot-shell/pilot-shell.component').then(
						(m) => m.PilotShellComponent,
					),
				children: pilotChildRoutes,
			},
		],
	},
	adminShellRoute,
	{
		path: 'agent-runtime-debug',
		canActivate: [authGuard, permissionGuard('agents.runtime_debug.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/agent-runtime-debug/agent-runtime-debug.component').then(
						(m) => m.AgentRuntimeDebugComponent,
					),
			},
		],
	},
	{
		path: 'internal-tools-debug',
		canActivate: [authGuard, permissionGuard('tools.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/internal-tools-debug/internal-tools-debug.component').then(
						(m) => m.InternalToolsDebugComponent,
					),
			},
		],
	},
	{
		path: 'mcp-debug',
		canActivate: [authGuard, permissionGuard('tools.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/mcp-debug/mcp-debug.component').then((m) => m.McpDebugComponent),
			},
		],
	},
	{
		path: 'connectors-debug',
		canActivate: [authGuard, permissionGuard('tools.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/connectors-debug/connectors-debug.component').then((m) => m.ConnectorsDebugComponent),
			},
		],
	},
	{
		path: 'browser-test-debug',
		canActivate: [authGuard, permissionGuard('tools.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/browser-test-debug/browser-test-debug.component').then(
						(m) => m.BrowserTestDebugComponent,
					),
			},
		],
	},
	{
		path: 'agent-readiness',
		canActivate: [authGuard, permissionGuard('agents.readiness.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/agent-readiness/agent-readiness.component').then(
						(m) => m.AgentReadinessComponent,
					),
			},
		],
	},
	{
		path: 'security-debug',
		canActivate: [authGuard, permissionGuard('system.debug.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/security-debug/security-debug.component').then((m) => m.SecurityDebugComponent),
			},
		],
	},
	{
		path: 'ops',
		canActivate: [authGuard, permissionGuard('system.debug.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/ops/ops-dashboard.component').then((m) => m.OpsDashboardComponent),
			},
		],
	},
	{
		path: 'agent-intelligence',
		canActivate: [authGuard, permissionGuard('agents.readiness.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/agent-intelligence/agent-intelligence-page.component').then(
						(m) => m.AgentIntelligencePageComponent,
					),
			},
		],
	},

	{ path: '**', redirectTo: 'login' },
];
