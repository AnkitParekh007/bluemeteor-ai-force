import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BrowserProfileApiService } from '../../core/services/browser-profile-api.service';
import { PlaywrightApiService } from '../../core/services/playwright-api.service';
import type { BrowserProfile } from '../../core/models/browser-profile.models';
import type { PlaywrightSpec, PlaywrightTestRun } from '../../core/models/playwright-test.models';

@Component({
	selector: 'app-browser-test-debug',
	standalone: true,
	imports: [FormsModule],
	templateUrl: './browser-test-debug.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowserTestDebugComponent {
	private readonly profilesApi = inject(BrowserProfileApiService);
	private readonly playwrightApi = inject(PlaywrightApiService);

	readonly profiles = signal<readonly BrowserProfile[]>([]);
	readonly runs = signal<readonly PlaywrightTestRun[]>([]);
	readonly specs = signal<readonly PlaywrightSpec[]>([]);
	readonly error = signal<string | null>(null);
	sessionIdInput = '';
	agentSlugInput = 'testo';

	refresh(): void {
		this.error.set(null);
		this.profilesApi.listProfiles().subscribe({
			next: (p) => this.profiles.set(p),
			error: (e) => this.error.set(String(e)),
		});
		const sid = this.sessionIdInput.trim();
		if (sid) {
			this.playwrightApi.listRuns(sid).subscribe({
				next: (r) => this.runs.set(r),
				error: () => this.runs.set([]),
			});
			this.playwrightApi.listSpecs(sid).subscribe({
				next: (s) => this.specs.set(s),
				error: () => this.specs.set([]),
			});
		}
	}

	runTemplate(key: 'login_smoke' | 'dashboard_smoke' | 'supplier_upload_smoke'): void {
		const sid = this.sessionIdInput.trim();
		if (!sid) {
			this.error.set('Set session id first (active agent session UUID).');
			return;
		}
		this.playwrightApi
			.runTemplate(key, { sessionId: sid, agentSlug: this.agentSlugInput })
			.subscribe({
				next: () => this.refresh(),
				error: (e) => this.error.set(String(e)),
			});
	}
}
