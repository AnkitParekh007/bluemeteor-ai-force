import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-admin-stat-card',
	standalone: true,
	template: `
		<div
			class="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80"
		>
			<div class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
				{{ label() }}
			</div>
			<div class="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
				{{ value() }}
			</div>
			@if (hint()) {
				<div class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ hint() }}</div>
			}
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatCardComponent {
	readonly label = input.required<string>();
	readonly value = input.required<string | number>();
	readonly hint = input<string>();
}
