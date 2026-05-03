import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';

import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

@Component({
	selector: 'app-audit-admin',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, Button, AdminSectionHeaderComponent],
	templateUrl: './audit-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditAdminComponent implements OnInit {
	private readonly admin = inject(AdminApiService);

	ngOnInit(): void {
		this.reload();
	}

	protected readonly rows = signal<
		Array<{
			id: string;
			action: string;
			actorEmail?: string;
			agentSlug?: string;
			sessionId?: string;
			runId?: string;
			details?: Record<string, unknown>;
			createdAt: string;
		}>
	>([]);

	protected actionQ = '';
	protected agentQ = '';
	protected runQ = '';
	protected actorQ = '';

	protected reload(): void {
		this.admin
			.getAuditLogs(200, {
				action: this.actionQ || undefined,
				agentSlug: this.agentQ || undefined,
				runId: this.runQ || undefined,
				actorEmail: this.actorQ || undefined,
			})
			.subscribe({ next: (r) => this.rows.set(r) });
	}

	protected copyTrace(id: string): void {
		void navigator.clipboard?.writeText?.(id);
	}

	protected exportCsv(): void {
		const lines = [
			['createdAt', 'action', 'actorEmail', 'agentSlug', 'runId', 'sessionId', 'id'].join(','),
			...this.rows().map((r) =>
				[r.createdAt, r.action, r.actorEmail ?? '', r.agentSlug ?? '', r.runId ?? '', r.sessionId ?? '', r.id]
					.map((c) => `"${String(c).replace(/"/g, '""')}"`)
					.join(','),
			),
		];
		const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
}
