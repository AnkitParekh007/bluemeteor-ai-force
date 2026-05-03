import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';
import { AgentApiService } from '../../core/services/agent-api.service';
import type {
	McpHealthResponse,
	McpServerRuntime,
	McpToolDefinition,
} from '../../core/models/mcp.models';

@Component({
	selector: 'app-mcp-debug',
	standalone: true,
	imports: [JsonPipe, FormsModule],
	templateUrl: './mcp-debug.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McpDebugComponent implements OnInit {
	private readonly api = inject(AgentApiService);

	ngOnInit(): void {
		this.refresh();
		this.loadServers();
	}

	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly health = signal<McpHealthResponse | null>(null);
	protected readonly servers = signal<McpServerRuntime[]>([]);
	protected readonly tools = signal<McpToolDefinition[]>([]);
	protected readonly lastResult = signal<unknown>(null);

	protected readonly mockMode = environment.enableMockAgents;

	protected callServerId = signal('demo-docs');
	protected callToolName = signal('search_docs');
	protected callInputJson = signal('{"query":"supplier upload"}');

	protected refresh(): void {
		this.loading.set(true);
		this.error.set(null);
		this.api.getMcpHealth().subscribe({
			next: (h) => {
				this.health.set(h);
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Request failed');
				this.loading.set(false);
			},
		});
	}

	protected loadServers(): void {
		this.loading.set(true);
		this.error.set(null);
		this.api.listMcpServers().subscribe({
			next: (r) => {
				this.servers.set(r.runtimes ?? []);
				this.lastResult.set(r);
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Request failed');
				this.loading.set(false);
			},
		});
	}

	protected loadTools(): void {
		this.loading.set(true);
		this.error.set(null);
		this.api.listMcpTools().subscribe({
			next: (t) => {
				this.tools.set(t);
				this.lastResult.set(t);
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Request failed');
				this.loading.set(false);
			},
		});
	}

	protected start(id: string): void {
		this.loading.set(true);
		this.error.set(null);
		this.api.startMcpServer(id).subscribe({
			next: (r) => {
				this.lastResult.set(r);
				this.loadServers();
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Start failed');
				this.loading.set(false);
			},
		});
	}

	protected stop(id: string): void {
		this.loading.set(true);
		this.error.set(null);
		this.api.stopMcpServer(id).subscribe({
			next: () => {
				this.lastResult.set({ stopped: id });
				this.loadServers();
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Stop failed');
				this.loading.set(false);
			},
		});
	}

	protected discover(id: string): void {
		this.loading.set(true);
		this.error.set(null);
		this.api.discoverMcpTools(id).subscribe({
			next: (t) => {
				this.tools.set(t);
				this.lastResult.set(t);
				this.loading.set(false);
			},
			error: (e: unknown) => {
				this.error.set(e instanceof Error ? e.message : 'Discover failed');
				this.loading.set(false);
			},
		});
	}

	protected runCall(): void {
		let input: Record<string, unknown> = {};
		try {
			input = JSON.parse(this.callInputJson()) as Record<string, unknown>;
		} catch {
			this.error.set('Invalid JSON input');
			return;
		}
		this.loading.set(true);
		this.error.set(null);
		this.api
			.callMcpTool({
				serverId: this.callServerId(),
				toolName: this.callToolName(),
				input,
			})
			.subscribe({
				next: (r) => {
					this.lastResult.set(r);
					this.loading.set(false);
				},
				error: (e: unknown) => {
					this.error.set(e instanceof Error ? e.message : 'Call failed');
					this.loading.set(false);
				},
			});
	}
}
