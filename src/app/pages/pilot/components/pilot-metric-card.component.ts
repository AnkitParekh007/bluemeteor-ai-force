import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-pilot-metric-card',
	standalone: true,
	template: `
		<div
			class="rounded-xl border p-4 shadow-sm"
			[class.border-emerald-200]="status() === 'good'"
			[class.bg-emerald-50\/80]="status() === 'good'"
			[class.border-amber-200]="status() === 'warning'"
			[class.bg-amber-50\/80]="status() === 'warning'"
			[class.border-rose-200]="status() === 'bad'"
			[class.bg-rose-50\/80]="status() === 'bad'"
			[class.border-slate-200]="status() === 'unknown'"
			[class.bg-white]="status() === 'unknown'"
			[class.dark:border-slate-700]="status() === 'unknown'"
			[class.dark:bg-slate-900\/80]="status() === 'unknown'"
		>
			<p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
				{{ label() }}
			</p>
			<p class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{{ value() }}</p>
			@if (target() != null && target() !== '') {
				<p class="text-xs text-slate-600 dark:text-slate-400">Target: {{ target() }}</p>
			}
			@if (description()) {
				<p class="mt-2 text-xs text-slate-600 dark:text-slate-400">{{ description() }}</p>
			}
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotMetricCardComponent {
	readonly label = input.required<string>();
	readonly value = input.required<string | number>();
	readonly target = input<string | number | undefined>(undefined);
	readonly status = input<'good' | 'warning' | 'bad' | 'unknown'>('unknown');
	readonly description = input<string | undefined>(undefined);
}
