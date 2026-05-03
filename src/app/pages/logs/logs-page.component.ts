import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { AuthApiService } from '../../core/services/auth-api.service';
import { environment } from '../../../environments/environment';

@Component({
	selector: 'app-logs-page',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div
			class="mx-auto max-w-6xl space-y-6 rounded-2xl border border-violet-200/60 bg-white/95 p-6 shadow-sm shadow-violet-500/5 backdrop-blur-sm dark:border-indigo-800/70 dark:bg-slate-900/85 dark:shadow-none sm:p-8"
		>
			<div>
				<h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
					Audit logs
				</h1>
				<p
					class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400"
				>
					Recent server-side agent and tool events (newest first).
				</p>
			</div>

			@if (env.enableMockAgents) {
				<p
					class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
				>
					Mock catalog mode: connect the live API to load audit entries.
				</p>
			} @else if (error()) {
				<p
					class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
					role="alert"
				>
					{{ error() }}
				</p>
			} @else if (rows()) {
				<div
					class="overflow-x-auto rounded-xl border border-violet-200/50 dark:border-indigo-800/60"
				>
					<table
						class="w-full min-w-[720px] text-left text-sm text-slate-800 dark:text-slate-200"
					>
						<thead
							class="bg-violet-50/80 text-xs font-semibold uppercase tracking-wide text-violet-900 dark:bg-indigo-950/60 dark:text-violet-200"
						>
							<tr>
								<th class="px-2 py-2.5">Time</th>
								<th class="px-2 py-2.5">Action</th>
								<th class="px-2 py-2.5">Actor</th>
								<th class="px-2 py-2.5">Agent</th>
								<th class="px-2 py-2.5">Run</th>
							</tr>
						</thead>
						<tbody>
							@for (e of rows(); track e.id) {
								<tr
									class="border-t border-violet-200/40 odd:bg-white/80 even:bg-slate-50/50 dark:border-indigo-900/50 dark:odd:bg-slate-900/50 dark:even:bg-slate-900/30"
								>
									<td
										class="whitespace-nowrap px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400"
									>
										{{ e.createdAt | date: 'medium' }}
									</td>
									<td class="px-2 py-1.5 font-mono text-xs">{{ e.action }}</td>
									<td class="px-2 py-1.5 text-xs">
										{{ e.actorEmail || e.actorUserId || '—' }}
									</td>
									<td class="px-2 py-1.5 text-xs">{{ e.agentSlug || '—' }}</td>
									<td
										class="px-2 py-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400"
									>
										{{ e.runId || '—' }}
									</td>
								</tr>
							}
						</tbody>
					</table>
				</div>
			} @else {
				<p class="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
			}
		</div>
	`,
})
export class LogsPageComponent {
	private readonly api = inject(AuthApiService);
	protected readonly env = environment;
	protected readonly error = signal<string | null>(null);

	protected readonly rows = toSignal(
		environment.enableMockAgents
			? of<
					Array<{
						id: string;
						action: string;
						actorUserId?: string;
						actorEmail?: string;
						agentSlug?: string;
						runId?: string;
						createdAt: string;
					}>
				>([])
			: this.api.listAuditLogs(200).pipe(
					catchError(() => {
						this.error.set(
							'Could not load audit logs. Check your session and API URL.',
						);
						return of([]);
					}),
				),
		{ initialValue: null },
	);
}
