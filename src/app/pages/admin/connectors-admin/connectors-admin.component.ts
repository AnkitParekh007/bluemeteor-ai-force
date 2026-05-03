import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Button } from 'primeng/button';

import type { ConnectorDefinition, ConnectorHealth } from '../../../core/models/connector.models';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';
import { AdminStatusBadgeComponent } from '../components/admin-status-badge.component';

@Component({
	selector: 'app-connectors-admin',
	standalone: true,
	imports: [CommonModule, Button, AdminSectionHeaderComponent, AdminStatusBadgeComponent],
	templateUrl: './connectors-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectorsAdminComponent implements OnInit {
	private readonly admin = inject(AdminApiService);

	protected readonly defs = signal<ConnectorDefinition[]>([]);
	protected readonly health = signal<ConnectorHealth[]>([]);
	protected readonly error = signal<string | null>(null);
	protected readonly busy = signal<string | null>(null);

	ngOnInit(): void {
		this.reload();
	}

	protected reload(): void {
		this.error.set(null);
		this.admin.listConnectorDefinitions().subscribe({
			next: (d) => this.defs.set(d),
			error: () => this.error.set('Could not load connector definitions.'),
		});
		this.admin.getConnectorHealth().subscribe({
			next: (h) => this.health.set(h),
			error: () => this.error.set('Could not load connector health.'),
		});
	}

	protected healthFor(id: string): ConnectorHealth | undefined {
		return this.health().find((h) => h.connectorId === id);
	}

	protected statusVariant(
		s: string,
	): 'neutral' | 'ok' | 'warn' | 'bad' {
		if (s === 'healthy' || s === 'enabled') return 'ok';
		if (s === 'missing_config' || s === 'disabled') return 'warn';
		if (s === 'unhealthy' || s === 'error') return 'bad';
		return 'neutral';
	}

	protected refreshOne(id: string): void {
		this.busy.set(id);
		this.admin.refreshConnectorHealth(id).subscribe({
			next: (h) => {
				this.health.update((list) => {
					const i = list.findIndex((x) => x.connectorId === id);
					const next = [...list];
					if (i >= 0) next[i] = h;
					else next.push(h);
					return next;
				});
				this.busy.set(null);
			},
			error: () => this.busy.set(null),
		});
	}
}
