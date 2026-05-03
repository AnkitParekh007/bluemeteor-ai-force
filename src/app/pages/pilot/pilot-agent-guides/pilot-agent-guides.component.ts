import { Component } from '@angular/core';

import { PILOT_AGENT_GUIDES } from '../../../core/data/pilot-agent-guides.data';
import { PilotAgentGuideCardComponent } from '../components/pilot-agent-guide-card.component';

@Component({
	selector: 'app-pilot-agent-guides',
	standalone: true,
	imports: [PilotAgentGuideCardComponent],
	templateUrl: './pilot-agent-guides.component.html',
})
export class PilotAgentGuidesComponent {
	protected readonly guides = PILOT_AGENT_GUIDES;
}
