import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-admin-section-header',
	standalone: true,
	template: `
		<div class="mb-3 flex flex-col gap-0.5 border-b border-slate-200/70 pb-2 dark:border-slate-700/70">
			<h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ title() }}</h2>
			@if (subtitle()) {
				<p class="text-xs text-slate-600 dark:text-slate-400">{{ subtitle() }}</p>
			}
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSectionHeaderComponent {
	readonly title = input.required<string>();
	readonly subtitle = input<string>();
}
