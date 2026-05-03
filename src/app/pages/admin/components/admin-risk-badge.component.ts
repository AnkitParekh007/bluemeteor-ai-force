import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ToolRiskLevel } from '../../../core/models/tool-definition.models';

@Component({
	selector: 'app-admin-risk-badge',
	standalone: true,
	template: `
		<span [class]="pillClass()">{{ risk() }}</span>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRiskBadgeComponent {
	readonly risk = input.required<ToolRiskLevel | string>();

	readonly pillClass = computed(() => {
		const base =
			'inline-flex rounded px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-900 dark:text-slate-100';
		const r = String(this.risk()).toLowerCase();
		if (r === 'critical') return `${base} bg-red-600/25`;
		if (r === 'high') return `${base} bg-orange-500/25`;
		if (r === 'medium') return `${base} bg-amber-400/25`;
		return `${base} bg-slate-400/20`;
	});
}
