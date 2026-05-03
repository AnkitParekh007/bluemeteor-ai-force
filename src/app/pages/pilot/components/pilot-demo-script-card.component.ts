import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { PilotDemoScript } from '../../../core/models/pilot.models';

@Component({
	selector: 'app-pilot-demo-script-card',
	standalone: true,
	imports: [RouterLink],
	template: `
		@let d = script();
		<article
			class="flex flex-col gap-3 rounded-2xl border border-violet-200/70 bg-white/95 p-5 shadow-sm dark:border-indigo-800/70 dark:bg-slate-900/85"
		>
			<header class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ d.title }}</h2>
				<span class="text-xs font-medium text-slate-500">{{ d.durationMinutes }} min · {{ d.agentSlug }}</span>
			</header>
			<p class="text-sm text-slate-600 dark:text-slate-400">{{ d.objective }}</p>
			<section>
				<h3 class="text-xs font-bold uppercase text-violet-600 dark:text-violet-300">Setup</h3>
				<ul class="mt-1 list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
					@for (s of d.setup; track s) {
						<li>{{ s }}</li>
					}
				</ul>
			</section>
			<section>
				<h3 class="text-xs font-bold uppercase text-violet-600 dark:text-violet-300">Prompts</h3>
				@for (p of d.prompts; track p) {
					<p
						class="mt-1 rounded-md bg-slate-50 p-2 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100"
					>
						{{ p }}
					</p>
				}
			</section>
			<section>
				<h3 class="text-xs font-bold uppercase text-violet-600 dark:text-violet-300">Expected</h3>
				<ul class="mt-1 list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
					@for (e of d.expectedResults; track e) {
						<li>{{ e }}</li>
					}
				</ul>
			</section>
			<section>
				<h3 class="text-xs font-bold uppercase text-violet-600 dark:text-violet-300">Success criteria</h3>
				<ul class="mt-1 list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
					@for (c of d.successCriteria; track c) {
						<li>{{ c }}</li>
					}
				</ul>
			</section>
			<p class="text-xs text-amber-800 dark:text-amber-200">
				<strong>Known limitations:</strong> internal pilot only; verify outputs; no production actions from demos.
			</p>
			<a
				[routerLink]="['/agents', d.agentSlug]"
				class="mt-1 inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
			>
				Open {{ d.agentSlug }}
			</a>
		</article>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotDemoScriptCardComponent {
	readonly script = input.required<PilotDemoScript>();
}
