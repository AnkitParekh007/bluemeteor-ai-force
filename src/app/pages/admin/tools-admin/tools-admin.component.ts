import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';

import type { ToolDefinition } from '../../../core/models/tool-definition.models';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminRiskBadgeComponent } from '../components/admin-risk-badge.component';
import { AdminSearchFilterBarComponent } from '../components/admin-search-filter-bar.component';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

@Component({
	selector: 'app-tools-admin',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		Dialog,
		AdminSectionHeaderComponent,
		AdminRiskBadgeComponent,
		AdminSearchFilterBarComponent,
	],
	templateUrl: './tools-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsAdminComponent implements OnInit {
	private readonly admin = inject(AdminApiService);

	protected readonly tools = signal<ToolDefinition[]>([]);
	protected readonly error = signal<string | null>(null);
	protected readonly search = signal('');
	protected readonly category = signal<string>('');
	protected readonly risk = signal<string>('');
	protected readonly detail = signal<ToolDefinition | null>(null);

	protected readonly filtered = computed(() => {
		let list = this.tools();
		const q = this.search().toLowerCase();
		if (q) {
			list = list.filter(
				(t) =>
					t.id.toLowerCase().includes(q) ||
					t.name.toLowerCase().includes(q) ||
					t.description.toLowerCase().includes(q),
			);
		}
		const c = this.category();
		if (c) list = list.filter((t) => t.category === c);
		const r = this.risk();
		if (r) list = list.filter((t) => t.riskLevel === r);
		return list;
	});

	ngOnInit(): void {
		this.admin.getTools().subscribe({
			next: (t) => this.tools.set(t),
			error: () => this.error.set('Could not load tools.'),
		});
	}

	protected categories(): string[] {
		const s = new Set(this.tools().map((t) => t.category));
		return [...s].sort();
	}

	protected open(t: ToolDefinition): void {
		this.detail.set(t);
	}

	protected close(): void {
		this.detail.set(null);
	}
}
