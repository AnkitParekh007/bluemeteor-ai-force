import { Component, computed, inject } from '@angular/core';

import { inferPilotRoleFromUser } from '../../../core/data/pilot-role.util';
import { AuthStore } from '../../../core/services/auth.store';
import { PilotStepCardComponent } from '../components/pilot-step-card.component';
import { PilotRoleCardComponent } from '../components/pilot-role-card.component';

@Component({
	selector: 'app-pilot-onboarding',
	standalone: true,
	imports: [PilotStepCardComponent, PilotRoleCardComponent],
	templateUrl: './pilot-onboarding.component.html',
})
export class PilotOnboardingComponent {
	private readonly auth = inject(AuthStore);

	protected readonly inferredRole = computed(() => inferPilotRoleFromUser(this.auth.user()));
}
