import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AgentWorkflowTemplate } from '../../../core/models/agent-intelligence.models';

@Component({
	selector: 'app-workflow-template-viewer',
	standalone: true,
	templateUrl: './workflow-template-viewer.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowTemplateViewerComponent {
	readonly workflow = input.required<AgentWorkflowTemplate>();
}
