import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';

import { environment } from '../../../../environments/environment';
import { AuthStore } from '../../../core/services/auth.store';
import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
	selector: 'app-admin-shell',
	standalone: true,
	imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, Button],
	templateUrl: './admin-shell.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent implements OnInit {
	protected readonly auth = inject(AuthStore);
	private readonly adminApi = inject(AdminApiService);

	protected readonly deployEnv = environment.deployEnv;
	protected readonly healthOk = signal<boolean | null>(null);
	protected readonly healthLoading = signal(false);

	readonly navItems = computed(() => {
		const items: { label: string; path: string }[] = [];
		items.push({ label: 'Overview', path: 'overview' });
		if (this.auth.hasAnyPermission('agents.manage', 'agents.readiness.view')) {
			items.push({ label: 'Agents', path: 'agents' });
		}
		if (this.auth.hasPermission('users.view')) {
			items.push({ label: 'Users', path: 'users' });
		}
		if (this.auth.hasPermission('tools.view')) {
			items.push({ label: 'Tools', path: 'tools' });
		}
		if (this.auth.hasAnyPermission('system.debug.view', 'tools.view')) {
			items.push({ label: 'Connectors', path: 'connectors' });
		}
		if (this.auth.hasAnyPermission('system.debug.view', 'tools.manage')) {
			items.push({ label: 'MCP', path: 'mcp' });
		}
		if (this.auth.hasPermission('agents.manage')) {
			items.push(
				{ label: 'Prompts', path: 'prompts' },
				{ label: 'Skill packs', path: 'skill-packs' },
				{ label: 'Workflows', path: 'workflows' },
			);
		}
		if (this.auth.hasAnyPermission('agents.readiness.view', 'agents.manage')) {
			items.push({ label: 'Evaluations', path: 'evaluations' });
		}
		if (this.auth.hasPermission('tools.approve')) {
			items.push({ label: 'Approvals', path: 'approvals' });
		}
		if (this.auth.hasPermission('audit.view')) {
			items.push({ label: 'Audit logs', path: 'audit' });
		}
		if (this.auth.hasPermission('system.debug.view')) {
			items.push({ label: 'Ops', path: 'ops' });
		}
		if (this.auth.hasPermission('agents.readiness.view')) {
			items.push({ label: 'Readiness', path: 'readiness' });
		}
		return items;
	});

	ngOnInit(): void {
		this.refreshHealth();
	}

	protected refreshHealth(): void {
		this.healthLoading.set(true);
		this.adminApi.getOpsHealth().subscribe({
			next: (h) => {
				this.healthOk.set(h['status'] === 'ok');
				this.healthLoading.set(false);
			},
			error: () => {
				this.healthOk.set(false);
				this.healthLoading.set(false);
			},
		});
	}

	protected userLabel(): string {
		const u = this.auth.user();
		if (!u) return '—';
		return u.name || u.email || u.id;
	}
}
