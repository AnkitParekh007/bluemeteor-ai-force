import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';

import type { McpHealthResponse, McpServerRuntime, McpToolDefinition } from '../../../core/models/mcp.models';
import { AgentApiService } from '../../../core/services/agent-api.service';
import { AuthStore } from '../../../core/services/auth.store';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

@Component({
	selector: 'app-mcp-admin',
	standalone: true,
	imports: [CommonModule, FormsModule, Button, AdminSectionHeaderComponent],
	templateUrl: './mcp-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McpAdminComponent implements OnInit {
	private readonly api = inject(AgentApiService);
	protected readonly auth = inject(AuthStore);

	protected readonly health = signal<McpHealthResponse | null>(null);
	protected readonly servers = signal<McpServerRuntime[]>([]);
	protected readonly tools = signal<McpToolDefinition[]>([]);
	protected readonly error = signal<string | null>(null);
	protected readonly lastCall = signal<string | null>(null);

	protected callServerId = '';
	protected callToolName = '';
	protected callInputJson = '{"query":"ping"}';

	ngOnInit(): void {
		this.refresh();
	}

	protected refresh(): void {
		this.error.set(null);
		this.api.getMcpHealth().subscribe({
			next: (h) => this.health.set(h),
			error: () => this.error.set('MCP health failed'),
		});
		this.api.listMcpServers().subscribe({
			next: (r) => this.servers.set(r.runtimes ?? []),
			error: () => this.error.set('Could not list MCP servers'),
		});
		this.api.listMcpTools().subscribe({
			next: (t) => this.tools.set(t),
			error: () => {},
		});
	}

	protected canManualCall(): boolean {
		return this.auth.hasPermission('system.debug.view') && this.auth.hasPermission('tools.execute.medium');
	}

	protected start(id: string): void {
		this.api.startMcpServer(id).subscribe({ next: () => this.refresh() });
	}

	protected stop(id: string): void {
		this.api.stopMcpServer(id).subscribe({ next: () => this.refresh() });
	}

	protected discover(id: string): void {
		this.api.discoverMcpTools(id).subscribe({ next: () => this.refresh() });
	}

	protected submitCall(): void {
		if (!this.canManualCall()) return;
		let input: Record<string, unknown> = {};
		try {
			input = JSON.parse(this.callInputJson || '{}') as Record<string, unknown>;
		} catch {
			this.lastCall.set('Invalid JSON input');
			return;
		}
		const tool = this.tools().find((t) => t.serverId === this.callServerId && t.name === this.callToolName);
		if (tool && !tool.readOnly) {
			this.lastCall.set('Blocked: tool is not read-only.');
			return;
		}
		this.api
			.callMcpTool({ serverId: this.callServerId, toolName: this.callToolName, input })
			.subscribe({
				next: (r) => this.lastCall.set(JSON.stringify(r, null, 2)),
				error: (e) => this.lastCall.set(String((e as Error)?.message ?? e)),
			});
	}
}
