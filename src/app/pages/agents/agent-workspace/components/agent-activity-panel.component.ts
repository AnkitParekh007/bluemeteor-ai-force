import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AgentRuntimeEvent } from '../../../../core/models/agent-runtime.models';

@Component({
	selector: 'app-agent-activity-panel',
	standalone: true,
	imports: [DatePipe],
	templateUrl: './agent-activity-panel.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentActivityPanelComponent {
	readonly events = input<readonly AgentRuntimeEvent[]>([]);
}
