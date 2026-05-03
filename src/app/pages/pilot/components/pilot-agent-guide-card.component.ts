import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { PilotAgentGuide } from '../../../core/models/pilot.models';

@Component({
	selector: 'app-pilot-agent-guide-card',
	standalone: true,
	imports: [RouterLink],
	template: `
		@let g = guide();
		<article
			class="flex flex-col gap-3 rounded-2xl border border-violet-200/70 bg-white/95 p-5 shadow-sm dark:border-indigo-800/70 dark:bg-slate-900/85"
		>
			<header>
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ g.agentName }}</h2>
				<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ g.description }}</p>
			</header>
			<section>
				<h3 class="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
					Best for
				</h3>
				<ul class="mt-1 list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
					@for (b of g.bestFor; track b) {
						<li>{{ b }}</li>
					}
				</ul>
			</section>
			<section>
				<h3 class="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
					Sample prompts
				</h3>
				<ul class="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
					@for (p of g.samplePrompts; track p) {
						<li class="rounded-md bg-slate-50 px-2 py-1 font-mono text-xs dark:bg-slate-800/80">{{ p }}</li>
					}
				</ul>
			</section>
			<section class="grid gap-3 sm:grid-cols-2">
				<div>
					<h3 class="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Do</h3>
					<ul class="mt-1 list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
						@for (x of g.do; track x) {
							<li>{{ x }}</li>
						}
					</ul>
				</div>
				<div>
					<h3 class="text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">Don’t</h3>
					<ul class="mt-1 list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
						@for (x of g.dont; track x) {
							<li>{{ x }}</li>
						}
					</ul>
				</div>
			</section>
			<section>
				<h3 class="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
					Expected outputs
				</h3>
				<ul class="mt-1 list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
					@for (e of g.expectedOutputs; track e) {
						<li>{{ e }}</li>
					}
				</ul>
			</section>
			<div class="mt-auto flex flex-wrap gap-2 border-t border-violet-100 pt-3 dark:border-indigo-900/60">
				<a
					[routerLink]="['/agents', g.agentSlug]"
					class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm"
				>
					Open agent
				</a>
				<a
					[routerLink]="['/pilot', 'feedback']"
					[queryParams]="{ agentSlug: g.agentSlug }"
					class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-indigo-700 dark:text-slate-100"
				>
					Submit feedback
				</a>
			</div>
		</article>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotAgentGuideCardComponent {
	readonly guide = input.required<PilotAgentGuide>();
}
