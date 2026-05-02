import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import type { AgentToolCall } from '../../../../core/models/agent-runtime.models';
import type { AgentConsoleEntry } from '../../../../core/models/agent-session.models';

type FilterLevel = 'all' | 'info' | 'warning' | 'error';

@Component({
	selector: 'app-agent-console-panel',
	standalone: true,
	imports: [DatePipe, NgClass],
	templateUrl: './agent-console-panel.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentConsolePanelComponent {
	readonly entries = input<readonly AgentConsoleEntry[]>([]);
	readonly toolCalls = input<readonly AgentToolCall[]>([]);

	readonly filter = signal<FilterLevel>('all');

	readonly filtered = computed(() => {
		const f = this.filter();
		const list = this.entries();
		if (f === 'all') return list;
		return list.filter((e) => e.level === f);
	});

	protected levelClass(level: string): string {
		switch (level) {
			case 'warning':
				return 'text-amber-700 dark:text-amber-300';
			case 'error':
				return 'text-red-600 dark:text-red-400';
			case 'success':
				return 'text-emerald-600 dark:text-emerald-400';
			default:
				return 'text-slate-700 dark:text-slate-300';
		}
	}

	protected filters: FilterLevel[] = ['all', 'info', 'warning', 'error'];
}
