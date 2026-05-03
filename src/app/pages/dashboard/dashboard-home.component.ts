import { Component } from '@angular/core';

@Component({
	selector: 'app-dashboard-home',
	standalone: true,
	template: `
		<div
			class="mx-auto max-w-4xl rounded-2xl border border-violet-200/60 bg-white/95 p-8 shadow-sm shadow-violet-500/5 backdrop-blur-sm dark:border-indigo-800/70 dark:bg-slate-900/85 dark:shadow-none"
		>
			<h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
				Dashboard
			</h1>
			<p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
				Overview metrics and shortcuts will appear here.
			</p>
		</div>
	`,
})
export class DashboardHomeComponent {}
