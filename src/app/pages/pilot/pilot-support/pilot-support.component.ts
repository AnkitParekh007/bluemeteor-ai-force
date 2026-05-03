import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-pilot-support',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './pilot-support.component.html',
})
export class PilotSupportComponent {
	protected readonly copied = signal(false);

	protected readonly issueTemplate = `[AI Force] Issue with {AgentName}

Details:
- Agent:
- Prompt:
- Expected:
- Actual:
- Run ID:
- Trace ID:
- User role:
- Screenshot:
- Severity:
`;

	protected copyTemplate(): void {
		void navigator.clipboard?.writeText?.(this.issueTemplate);
		this.copied.set(true);
		setTimeout(() => this.copied.set(false), 2000);
	}
}
