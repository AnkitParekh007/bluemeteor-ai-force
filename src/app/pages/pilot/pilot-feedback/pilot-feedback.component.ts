import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { inferPilotRoleFromUser } from '../../../core/data/pilot-role.util';
import type { PilotRole } from '../../../core/models/pilot.models';
import { AuthStore } from '../../../core/services/auth.store';
import { PilotFeedbackFormComponent } from '../components/pilot-feedback-form.component';

@Component({
	selector: 'app-pilot-feedback',
	standalone: true,
	imports: [PilotFeedbackFormComponent],
	templateUrl: './pilot-feedback.component.html',
})
export class PilotFeedbackComponent {
	private readonly route = inject(ActivatedRoute);
	private readonly auth = inject(AuthStore);

	private readonly qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

	protected readonly defaultRole = computed((): PilotRole => inferPilotRoleFromUser(this.auth.user()));

	protected readonly agentFromQuery = computed(() => {
		const m = this.qp();
		return (m.get('agentSlug') ?? m.get('agent') ?? '').trim();
	});

	protected readonly sessionId = computed(() => this.qp().get('sessionId')?.trim() ?? '');
	protected readonly runId = computed(() => this.qp().get('runId')?.trim() ?? '');
	protected readonly traceId = computed(() => this.qp().get('traceId')?.trim() ?? '');
}
