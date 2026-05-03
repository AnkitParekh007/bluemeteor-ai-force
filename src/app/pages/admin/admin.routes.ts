import type { Route } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { adminSectionGuard, permissionGuardAny } from '../../core/guards/permission.guard';

const adminEntryPerms = [
	'system.admin',
	'system.debug.view',
	'agents.manage',
	'users.view',
	'audit.view',
	'tools.view',
	'tools.approve',
	'agents.readiness.view',
	'tools.manage',
] as const;

export const adminShellRoute: Route = {
	path: 'admin',
	canActivate: [authGuard, permissionGuardAny(...adminEntryPerms)],
	loadComponent: () =>
		import('./admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
	children: [
		{ path: '', pathMatch: 'full' as const, redirectTo: 'overview' },
		{
			path: 'access-denied',
			loadComponent: () =>
				import('./admin-access-denied.component').then((m) => m.AdminAccessDeniedComponent),
		},
		{
			path: 'overview',
			loadComponent: () =>
				import('./admin-overview/admin-overview.component').then((m) => m.AdminOverviewComponent),
		},
		{
			path: 'agents',
			canActivate: [adminSectionGuard('agents.manage', 'agents.readiness.view')],
			loadComponent: () => import('./agents-admin/agents-admin.component').then((m) => m.AgentsAdminComponent),
		},
		{
			path: 'users',
			canActivate: [adminSectionGuard('users.view')],
			loadComponent: () => import('./users-admin/users-admin.component').then((m) => m.UsersAdminComponent),
		},
		{
			path: 'tools',
			canActivate: [adminSectionGuard('tools.view')],
			loadComponent: () => import('./tools-admin/tools-admin.component').then((m) => m.ToolsAdminComponent),
		},
		{
			path: 'connectors',
			canActivate: [adminSectionGuard('system.debug.view', 'tools.view')],
			loadComponent: () =>
				import('./connectors-admin/connectors-admin.component').then((m) => m.ConnectorsAdminComponent),
		},
		{
			path: 'mcp',
			canActivate: [adminSectionGuard('system.debug.view', 'tools.manage')],
			loadComponent: () => import('./mcp-admin/mcp-admin.component').then((m) => m.McpAdminComponent),
		},
		{
			path: 'prompts',
			canActivate: [adminSectionGuard('agents.manage')],
			loadComponent: () =>
				import('./prompts-admin/prompts-admin.component').then((m) => m.PromptsAdminComponent),
		},
		{
			path: 'skill-packs',
			canActivate: [adminSectionGuard('agents.manage')],
			loadComponent: () =>
				import('./skill-packs-admin/skill-packs-admin.component').then((m) => m.SkillPacksAdminComponent),
		},
		{
			path: 'workflows',
			canActivate: [adminSectionGuard('agents.manage')],
			loadComponent: () =>
				import('./workflows-admin/workflows-admin.component').then((m) => m.WorkflowsAdminComponent),
		},
		{
			path: 'evaluations',
			canActivate: [adminSectionGuard('agents.readiness.view', 'agents.manage')],
			loadComponent: () =>
				import('./evaluations-admin/evaluations-admin.component').then((m) => m.EvaluationsAdminComponent),
		},
		{
			path: 'approvals',
			canActivate: [adminSectionGuard('tools.approve')],
			loadComponent: () =>
				import('./approvals-admin/approvals-admin.component').then((m) => m.ApprovalsAdminComponent),
		},
		{
			path: 'audit',
			canActivate: [adminSectionGuard('audit.view')],
			loadComponent: () => import('./audit-admin/audit-admin.component').then((m) => m.AuditAdminComponent),
		},
		{
			path: 'ops',
			canActivate: [adminSectionGuard('system.debug.view')],
			loadComponent: () => import('./ops-admin/ops-admin.component').then((m) => m.OpsAdminComponent),
		},
		{
			path: 'readiness',
			canActivate: [adminSectionGuard('agents.readiness.view')],
			loadComponent: () =>
				import('./readiness-admin/readiness-admin.component').then((m) => m.ReadinessAdminComponent),
		},
	],
};
