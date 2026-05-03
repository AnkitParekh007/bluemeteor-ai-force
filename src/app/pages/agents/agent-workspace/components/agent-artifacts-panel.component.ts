import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AgentArtifact } from '../../../../core/models/agent-artifact.models';

@Component({
	selector: 'app-agent-artifacts-panel',
	standalone: true,
	imports: [DatePipe],
	templateUrl: './agent-artifacts-panel.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentArtifactsPanelComponent {
	readonly artifacts = input<readonly AgentArtifact[]>([]);
}
