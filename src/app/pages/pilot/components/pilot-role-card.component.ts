import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-pilot-role-card',
	standalone: true,
	imports: [RouterLink],
	template: `
		<div
			class="flex flex-col gap-3 rounded-xl border border-violet-200/70 bg-white/90 p-4 shadow-sm dark:border-indigo-800/70 dark:bg-slate-900/80"
		>
			<div>
				<p class="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
					{{ roleLabel() }}
				</p>
				<h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ title() }}</h3>
				<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ blurb() }}</p>
			</div>
			<a
				[routerLink]="['/agents', agentSlug()]"
				class="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-cyan-400 hover:to-violet-500"
			>
				Open {{ agentName() }}
			</a>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotRoleCardComponent {
	readonly roleLabel = input.required<string>();
	readonly title = input.required<string>();
	readonly blurb = input.required<string>();
	readonly agentSlug = input.required<string>();
	readonly agentName = input.required<string>();
}
