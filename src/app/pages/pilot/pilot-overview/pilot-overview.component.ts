import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
	MOCK_ENTERPRISE_APPROVALS,
	MOCK_ENTERPRISE_WORKFLOWS,
	MOCK_PILOT_FEEDBACK,
	MOCK_PILOT_METRICS,
} from '../../../core/data/mock-enterprise-demo-data';

@Component({
	selector: 'app-pilot-overview',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './pilot-overview.component.html',
})
export class PilotOverviewComponent {
	protected readonly pilotMetrics = MOCK_PILOT_METRICS;
	protected readonly pilotFeedback = MOCK_PILOT_FEEDBACK;
	protected readonly pilotApprovals = MOCK_ENTERPRISE_APPROVALS;
	protected readonly pilotWorkflows = MOCK_ENTERPRISE_WORKFLOWS;
}
