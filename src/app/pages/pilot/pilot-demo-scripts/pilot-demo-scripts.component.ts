import { Component } from '@angular/core';

import { PILOT_DEMO_SCRIPTS } from '../../../core/data/pilot-demo-scripts.data';
import { PilotDemoScriptCardComponent } from '../components/pilot-demo-script-card.component';

@Component({
	selector: 'app-pilot-demo-scripts',
	standalone: true,
	imports: [PilotDemoScriptCardComponent],
	templateUrl: './pilot-demo-scripts.component.html',
})
export class PilotDemoScriptsComponent {
	protected readonly demos = PILOT_DEMO_SCRIPTS;
}
