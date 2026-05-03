import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { AdminApiService } from '../../../core/services/admin-api.service';
import { AgentApiService } from '../../../core/services/agent-api.service';
import { AuthStore } from '../../../core/services/auth.store';
import { AdminRiskBadgeComponent } from '../components/admin-risk-badge.component';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

type ApprovalRow = {
	id: string;
	runId: string;
	sessionId: string;
	agentSlug: string;
	traceId?: string | null;
	title?: string | null;
	riskLevel?: string | null;
	actionType?: string | null;
	status: string;
	createdAt: string;
	resolvedAt?: string | null;
	resolvedByEmail?: string | null;
	payloadPreview?: string | null;
	requestedByUserId?: string | null;
};

@Component({
	selector: 'app-approvals-admin',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterLink,
		Button,
		Dialog,
		AdminSectionHeaderComponent,
		AdminRiskBadgeComponent,
	],
	templateUrl: './approvals-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalsAdminComponent implements OnInit {
	private readonly admin = inject(AdminApiService);
	private readonly agents = inject(AgentApiService);
	protected readonly auth = inject(AuthStore);

	protected readonly rows = signal<ApprovalRow[]>([]);
	protected readonly filterStatus = signal<string>('');
	protected readonly payload = signal<ApprovalRow | null>(null);

	ngOnInit(): void {
		this.reload();
	}

	protected reload(): void {
		const st = this.filterStatus();
		this.admin.listAdminApprovals({ status: st || undefined, limit: 100 }).subscribe({
			next: (list) => this.rows.set(list as ApprovalRow[]),
		});
	}

	protected approve(r: ApprovalRow): void {
		if (!this.auth.canApproveTools()) return;
		this.agents
			.submitApproval({
				sessionId: r.sessionId,
				runId: r.runId,
				approvalId: r.id,
				decision: 'approved',
			})
			.subscribe({ next: () => this.reload() });
	}

	protected reject(r: ApprovalRow): void {
		if (!this.auth.canApproveTools()) return;
		this.agents
			.submitApproval({
				sessionId: r.sessionId,
				runId: r.runId,
				approvalId: r.id,
				decision: 'rejected',
			})
			.subscribe({ next: () => this.reload() });
	}

	protected showPayload(r: ApprovalRow): void {
		this.payload.set(r);
	}

	protected highRisk(r: ApprovalRow): boolean {
		const rl = (r.riskLevel || '').toLowerCase();
		return rl === 'high' || rl === 'critical';
	}
}
