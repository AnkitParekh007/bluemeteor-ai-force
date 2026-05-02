import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AuthStore } from '../../core/services/auth.store';
import { environment } from '../../../environments/environment';

@Component({
	selector: 'app-settings-page',
	standalone: true,
	imports: [JsonPipe],
	template: `
		<div
			class="mx-auto max-w-4xl space-y-8 rounded-2xl border border-violet-200/60 bg-white/95 p-8 shadow-sm shadow-violet-500/5 backdrop-blur-sm dark:border-indigo-800/70 dark:bg-slate-900/85 dark:shadow-none"
		>
			<div>
				<h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
					Settings
				</h1>
				<p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
					Session, permissions snapshot, and compile-time agent runtime flags.
				</p>
			</div>

			@if (!env.enableMockAgents) {
				<section>
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Session</h2>
					<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
						Signed-in identity from <code class="text-xs">/auth/me</code>.
					</p>
					@if (auth.user(); as u) {
						<dl
							class="mt-4 grid gap-3 rounded-xl border border-violet-200/50 bg-violet-50/40 p-4 text-sm dark:border-indigo-800/60 dark:bg-indigo-950/40"
						>
							<div class="flex flex-wrap gap-2">
								<dt class="font-medium text-slate-600 dark:text-slate-400">
									Email
								</dt>
								<dd class="font-mono text-slate-900 dark:text-slate-100">
									{{ u.email }}
								</dd>
							</div>
							<div class="flex flex-wrap gap-2">
								<dt class="font-medium text-slate-600 dark:text-slate-400">Name</dt>
								<dd class="text-slate-900 dark:text-slate-100">{{ u.name }}</dd>
							</div>
							<div class="flex flex-wrap gap-2">
								<dt class="font-medium text-slate-600 dark:text-slate-400">
									Roles
								</dt>
								<dd class="text-slate-900 dark:text-slate-100">
									{{ u.roles.join(', ') || '—' }}
								</dd>
							</div>
							<div>
								<dt class="font-medium text-slate-600 dark:text-slate-400">
									Permissions
								</dt>
								<dd
									class="mt-1 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200"
								>
									{{ u.permissions.join(', ') }}
								</dd>
							</div>
						</dl>
					} @else {
						<p class="mt-3 text-sm text-amber-800 dark:text-amber-200">
							Not signed in.
						</p>
					}
				</section>
			} @else {
				<section>
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Session</h2>
					<p class="mt-1 text-sm text-cyan-900 dark:text-cyan-100">
						Mock catalog mode — no API session. Toggle
						<code class="text-xs">enableMockAgents</code> off and sign in to see RBAC.
					</p>
				</section>
			}

			<section>
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Agent runtime</h2>
				<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
					Values come from <code class="text-xs">environment.ts</code> (build-time). Copy
					what you need for local debugging.
				</p>
				<pre
					class="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-200"
					>{{ runtimeFlags | json }}</pre
				>
			</section>
		</div>
	`,
})
export class SettingsPageComponent {
	protected readonly auth = inject(AuthStore);
	protected readonly env = environment;
	protected readonly runtimeFlags = {
		agentApiBaseUrl: environment.agentApiBaseUrl,
		enableMockAgents: environment.enableMockAgents,
		enableAgentStreaming: environment.enableAgentStreaming,
		enableApprovalGates: environment.enableApprovalGates,
		enableBrowserWorkspace: environment.enableBrowserWorkspace,
		enableSessionPersistence: environment.enableSessionPersistence,
		enableDebugRuntimeLogs: environment.enableDebugRuntimeLogs,
		production: environment.production,
	};
}
