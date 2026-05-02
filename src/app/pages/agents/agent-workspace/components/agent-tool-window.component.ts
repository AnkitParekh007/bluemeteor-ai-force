import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type {
	AgentApprovalRequest,
	AgentRuntimeEvent,
	AgentToolCall,
} from '../../../../core/models/agent-runtime.models';
import type {
	AgentBrowserState,
	AgentConsoleEntry,
	AgentTestResult,
	AgentToolTab,
} from '../../../../core/models/agent-session.models';
import type { AgentArtifact } from '../../../../core/models/agent-artifact.models';
import { AgentActivityPanelComponent } from './agent-activity-panel.component';
import { AgentApprovalPanelComponent } from './agent-approval-panel.component';
import { AgentArtifactsPanelComponent } from './agent-artifacts-panel.component';
import { AgentBrowserPreviewComponent } from './agent-browser-preview.component';
import { AgentConsolePanelComponent } from './agent-console-panel.component';
import { AgentInternalToolsPanelComponent } from './agent-internal-tools-panel.component';
import { AgentTestResultsPanelComponent } from './agent-test-results-panel.component';

@Component({
	selector: 'app-agent-tool-window',
	standalone: true,
	imports: [
		AgentBrowserPreviewComponent,
		AgentArtifactsPanelComponent,
		AgentConsolePanelComponent,
		AgentTestResultsPanelComponent,
		AgentInternalToolsPanelComponent,
		AgentActivityPanelComponent,
		AgentApprovalPanelComponent,
	],
	templateUrl: './agent-tool-window.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentToolWindowComponent {
	readonly collapsed = input(false);
	readonly activeTab = input<AgentToolTab>('browser');
	readonly browserState = input<AgentBrowserState | undefined>(undefined);
	readonly artifacts = input<readonly AgentArtifact[]>([]);
	readonly consoleEntries = input<readonly AgentConsoleEntry[]>([]);
	readonly toolCalls = input<readonly AgentToolCall[]>([]);
	readonly testResults = input<readonly AgentTestResult[]>([]);
	readonly runtimeEvents = input<readonly AgentRuntimeEvent[]>([]);
	readonly approvals = input<readonly AgentApprovalRequest[]>([]);

	readonly tabChange = output<AgentToolTab>();
	readonly toggleCollapsed = output<void>();
	readonly browserStartPreview = output<void>();
	readonly approveRequest = output<AgentApprovalRequest>();
	readonly rejectRequest = output<AgentApprovalRequest>();

	protected readonly tabs: { id: AgentToolTab; label: string; icon: string }[] = [
		{ id: 'browser', label: 'Browser', icon: 'pi pi-globe' },
		{ id: 'artifacts', label: 'Artifacts', icon: 'pi pi-folder-open' },
		{ id: 'console', label: 'Console', icon: 'pi pi-desktop' },
		{ id: 'tests', label: 'Tests', icon: 'pi pi-list-check' },
		{ id: 'tools', label: 'Tools', icon: 'pi pi-wrench' },
		{ id: 'activity', label: 'Activity', icon: 'pi pi-history' },
		{ id: 'approvals', label: 'Approvals', icon: 'pi pi-shield' },
	];

	protected pickTab(t: AgentToolTab): void {
		this.tabChange.emit(t);
	}
}
