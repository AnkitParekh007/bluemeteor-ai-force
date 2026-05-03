import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	input,
	output,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PILOT_AGENT_GUIDES } from '../../../core/data/pilot-agent-guides.data';
import type { PilotFeedbackPayload, PilotRole } from '../../../core/models/pilot.models';
import { PilotApiService } from '../../../core/services/pilot-api.service';

const ROLES: readonly PilotRole[] = [
	'frontend_engineer',
	'backend_engineer',
	'qa_engineer',
	'product_manager',
	'documentation_owner',
	'data_analyst',
	'support_agent',
	'devops_engineer',
	'team_lead',
	'admin',
];

@Component({
	selector: 'app-pilot-feedback-form',
	standalone: true,
	imports: [FormsModule],
	templateUrl: './pilot-feedback-form.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotFeedbackFormComponent {
	private readonly pilotApi = inject(PilotApiService);

	readonly defaultUserRole = input<PilotRole>('qa_engineer');
	readonly defaultAgentSlug = input<string>('');
	readonly sessionId = input<string | undefined>(undefined);
	readonly runId = input<string | undefined>(undefined);
	readonly traceId = input<string | undefined>(undefined);

	readonly submitted = output<void>();

	protected readonly roles = ROLES;
	protected readonly agentSlugs = PILOT_AGENT_GUIDES.map((g) => g.agentSlug);

	protected userRole = signal<PilotRole>('qa_engineer');
	protected agentSlug = signal('');
	protected taskType = signal('');
	protected rating = signal(4);
	protected whatWorked = signal('');
	protected whatFailed = signal('');
	protected timeSavedMinutes = signal<number | null>(null);
	protected wouldUseAgain = signal(true);
	protected notes = signal('');

	protected submitting = signal(false);
	protected success = signal(false);
	protected error = signal<string | null>(null);

	constructor() {
		effect(() => {
			this.userRole.set(this.defaultUserRole());
			const a = this.defaultAgentSlug()?.trim();
			if (a) this.agentSlug.set(a);
		});
	}

	protected submit(): void {
		const slug = this.agentSlug().trim();
		const task = this.taskType().trim();
		const worked = this.whatWorked().trim();
		const failed = this.whatFailed().trim() || 'Nothing significant.';
		if (!slug || !task || !worked) {
			this.error.set('Agent, task type, and “what worked” are required.');
			return;
		}
		this.submitting.set(true);
		this.error.set(null);
		this.success.set(false);
		const body: PilotFeedbackPayload = {
			userRole: this.userRole(),
			agentSlug: slug,
			rating: this.rating(),
			taskType: task,
			whatWorked: worked,
			whatFailed: failed,
			wouldUseAgain: this.wouldUseAgain(),
			notes: this.notes().trim() || undefined,
			timeSavedMinutes: this.timeSavedMinutes() ?? undefined,
			sessionId: this.sessionId()?.trim() || undefined,
			runId: this.runId()?.trim() || undefined,
			traceId: this.traceId()?.trim() || undefined,
		};
		this.pilotApi.submitFeedback(body).subscribe({
			next: () => {
				this.submitting.set(false);
				this.success.set(true);
				this.submitted.emit();
			},
			error: (e: { error?: { message?: string }; message?: string }) => {
				this.submitting.set(false);
				this.error.set(
					typeof e?.error?.message === 'string'
						? e.error.message
						: typeof e?.message === 'string'
							? e.message
							: 'Could not submit feedback.',
				);
			},
		});
	}
}
