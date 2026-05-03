import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-pilot-step-card',
	standalone: true,
	template: `
		<div
			class="flex gap-3 rounded-xl border border-violet-200/70 bg-white/90 p-4 shadow-sm dark:border-indigo-800/70 dark:bg-slate-900/80"
		>
			<span
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 text-sm font-bold text-white"
				>{{ step() }}</span
			>
			<div class="min-w-0">
				<h3 class="text-sm font-semibold text-slate-900 dark:text-white">{{ title() }}</h3>
				<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ body() }}</p>
				<ng-content />
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotStepCardComponent {
	readonly step = input.required<number>();
	readonly title = input.required<string>();
	readonly body = input.required<string>();
}
