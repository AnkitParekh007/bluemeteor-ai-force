import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import type { ConnectorDefinition, ConnectorHealth } from '../../core/models/connector.models';
import { ConnectorApiService } from '../../core/services/connector-api.service';

@Component({
	selector: 'app-connectors-debug',
	standalone: true,
	imports: [JsonPipe],
	templateUrl: './connectors-debug.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectorsDebugComponent implements OnInit {
	private readonly connectors = inject(ConnectorApiService);

	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly definitions = signal<ConnectorDefinition[]>([]);
	protected readonly health = signal<ConnectorHealth[]>([]);
	protected readonly preview = signal<unknown>(null);
	protected readonly mockMode = environment.enableMockAgents;

	ngOnInit(): void {
		this.loadAll();
	}

	protected loadAll(): void {
		this.loading.set(true);
		this.error.set(null);
		this.connectors.listConnectors().subscribe({
			next: (d) => {
				this.definitions.set(d);
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Failed');
				this.loading.set(false);
			},
		});
		this.connectors.getConnectorHealth().subscribe({
			next: (h) => this.health.set(h),
			error: () => {},
		});
	}

	protected refreshHealth(): void {
		this.loading.set(true);
		this.error.set(null);
		this.connectors.getConnectorHealth().subscribe({
			next: (h) => {
				this.health.set(h);
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Failed');
				this.loading.set(false);
			},
		});
	}

	protected testRepoSearch(): void {
		this.connectors.repositorySearch('supplier upload').subscribe({
			next: (r) => this.preview.set(r),
			error: (e: unknown) =>
				this.preview.set({ error: e instanceof Error ? e.message : String(e) }),
		});
	}

	protected testTicketSearch(): void {
		this.connectors.ticketSearch('upload').subscribe({
			next: (r) => this.preview.set(r),
			error: (e: unknown) =>
				this.preview.set({ error: e instanceof Error ? e.message : String(e) }),
		});
	}

	protected testDocsSearch(): void {
		this.connectors.docsSearch('supplier').subscribe({
			next: (r) => this.preview.set(r),
			error: (e: unknown) =>
				this.preview.set({ error: e instanceof Error ? e.message : String(e) }),
		});
	}

	protected testCicd(): void {
		this.connectors.analyzeCicd().subscribe({
			next: (r) => this.preview.set(r),
			error: (e: unknown) =>
				this.preview.set({ error: e instanceof Error ? e.message : String(e) }),
		});
	}
}
