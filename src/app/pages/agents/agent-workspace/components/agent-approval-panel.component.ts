import { DatePipe, JsonPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { AgentApprovalRequest } from '../../../../core/models/agent-runtime.models';

@Component({
	selector: 'app-agent-approval-panel',
	standalone: true,
	imports: [DatePipe, JsonPipe, NgClass],
	templateUrl: './agent-approval-panel.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentApprovalPanelComponent {
	readonly approvals = input<readonly AgentApprovalRequest[]>([]);

	readonly approve = output<AgentApprovalRequest>();
	readonly reject = output<AgentApprovalRequest>();

	protected riskClass(r: AgentApprovalRequest['riskLevel']): string {
		switch (r) {
			case 'critical':
				return 'border-red-500/60 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100';
			case 'high':
				return 'border-amber-500/50 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100';
			case 'medium':
				return 'border-violet-300/60 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100';
			default:
				return 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100';
		}
	}
}
