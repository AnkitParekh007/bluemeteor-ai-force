import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { AgentRun } from '../../../../core/models/agent-runtime.models';
import type {
	AgentSession,
	AgentSessionStatus,
	AgentWorkspaceMode,
} from '../../../../core/models/agent-session.models';
import type { Agent } from '../../../../core/models/agent.models';

@Component({
	selector: 'app-agent-session-header',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './agent-session-header.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentSessionHeaderComponent {
	readonly agent = input.required<Agent>();
	readonly activeSession = input<AgentSession | undefined>(undefined);
	readonly mode = input<AgentWorkspaceMode>('ask');
	readonly status = input<AgentSessionStatus>('idle');
	readonly rightPanelCollapsed = input(false);
	readonly activeRun = input<AgentRun | undefined>(undefined);
	readonly hasPendingApproval = input(false);
	readonly modeAskDisabled = input(false);
	readonly modePlanDisabled = input(false);
	readonly modeActDisabled = input(false);

	readonly modeChange = output<AgentWorkspaceMode>();
	readonly toggleRightPanel = output<void>();
	readonly openBrowser = output<void>();
	readonly renameSession = output<void>();

	protected readonly modes: { value: AgentWorkspaceMode; label: string }[] = [
		{ value: 'ask', label: 'Ask' },
		{ value: 'plan', label: 'Plan' },
		{ value: 'act', label: 'Act' },
	];

	protected statusLabel(s: AgentSessionStatus): string {
		return s;
	}

	protected runLabel(): string {
		const r = this.activeRun();
		return r?.status ?? '';
	}
}
