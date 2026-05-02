import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { AgentTestResult } from '../../../../core/models/agent-session.models';

@Component({
	selector: 'app-agent-test-results-panel',
	standalone: true,
	templateUrl: './agent-test-results-panel.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentTestResultsPanelComponent {
	readonly results = input<readonly AgentTestResult[]>([]);

	readonly summary = computed(() => {
		const r = this.results();
		return {
			passed: r.filter((x) => x.status === 'passed').length,
			failed: r.filter((x) => x.status === 'failed').length,
			skipped: r.filter((x) => x.status === 'skipped').length,
			running: r.filter((x) => x.status === 'running').length,
		};
	});
}
