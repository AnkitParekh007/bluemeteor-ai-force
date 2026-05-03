import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-admin-empty-state',
	standalone: true,
	template: `
		<div
			class="rounded-lg border border-dashed border-slate-300/80 bg-slate-50/50 px-4 py-8 text-center dark:border-slate-600/60 dark:bg-slate-900/40"
		>
			<p class="text-sm text-slate-600 dark:text-slate-400">{{ message() }}</p>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEmptyStateComponent {
	readonly message = input<string>('No data.');
}
