import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
	selector: 'app-admin-status-badge',
	standalone: true,
	template: `
		<span [class]="pillClass()">{{ status() }}</span>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatusBadgeComponent {
	readonly status = input.required<string>();
	readonly variant = input<'neutral' | 'ok' | 'warn' | 'bad'>('neutral');

	readonly pillClass = computed(() => {
		const base =
			'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide';
		switch (this.variant()) {
			case 'ok':
				return `${base} bg-emerald-500/15 text-emerald-800 dark:text-emerald-200`;
			case 'warn':
				return `${base} bg-amber-500/15 text-amber-900 dark:text-amber-200`;
			case 'bad':
				return `${base} bg-red-500/15 text-red-800 dark:text-red-200`;
			default:
				return `${base} bg-slate-500/10 text-slate-700 dark:text-slate-300`;
		}
	});
}
