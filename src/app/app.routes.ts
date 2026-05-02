import { Routes } from '@angular/router';

import { agentFeatureRoutes } from './pages/agents/agents.routes';
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
		path: 'admin',
		canActivate: [authGuard, permissionGuard('users.view')],
		loadComponent: () =>
			import('./pages/shell/dashboard-layout.component').then(
				(m) => m.DashboardLayoutComponent,
			),
		children: [
			{
				path: 'users',
				loadComponent: () =>
					import('./pages/admin/admin-users-page.component').then(
						(m) => m.AdminUsersPageComponent,
					),
			},
		],
	},
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

	{ path: '**', redirectTo: 'login' },
];
