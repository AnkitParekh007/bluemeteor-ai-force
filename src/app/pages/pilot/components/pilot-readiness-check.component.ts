import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { PilotReadinessCheck as PilotReadinessCheckModel } from '../../../core/models/pilot.models';

@Component({
	selector: 'app-pilot-readiness-check',
	standalone: true,
	template: `
		@let c = check();
		<div
			class="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm"
			[class.border-emerald-200]="c.status === 'passed'"
			[class.bg-emerald-50\/70]="c.status === 'passed'"
			[class.border-amber-200]="c.status === 'warning' || c.status === 'in_progress'"
			[class.bg-amber-50\/60]="c.status === 'warning' || c.status === 'in_progress'"
			[class.border-rose-300]="c.status === 'failed'"
			[class.bg-rose-50\/70]="c.status === 'failed'"
			[class.border-slate-200]="c.status === 'not_started'"
			[class.bg-slate-50]="c.status === 'not_started'"
			[class.dark:border-slate-700]="c.status === 'not_started'"
			[class.dark:bg-slate-900\/70]="c.status === 'not_started'"
		>
			<div class="flex flex-wrap items-center gap-2">
				<span
					class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
					[class.bg-rose-200]="c.severity === 'critical'"
					[class.text-rose-900]="c.severity === 'critical'"
					[class.bg-amber-200]="c.severity === 'high'"
					[class.bg-slate-200]="c.severity === 'medium' || c.severity === 'low'"
					>{{ c.severity }}</span
				>
				<span class="font-semibold text-slate-900 dark:text-white">{{ c.title }}</span>
				<span class="text-xs text-slate-500">· {{ c.status }}</span>
			</div>
			<p class="text-xs text-slate-600 dark:text-slate-400">{{ c.description }}</p>
			@if (c.recommendation) {
				<p class="text-xs font-medium text-violet-800 dark:text-violet-200">{{ c.recommendation }}</p>
			}
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotReadinessCheckComponent {
	readonly check = input.required<PilotReadinessCheckModel>();
}
