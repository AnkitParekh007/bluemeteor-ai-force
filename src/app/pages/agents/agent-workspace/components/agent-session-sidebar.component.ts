import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import type { AgentSession } from '../../../../core/models/agent-session.models';
import type { Agent } from '../../../../core/models/agent.models';

type SessionGroup = 'today' | 'yesterday' | 'week' | 'older';

@Component({
	selector: 'app-agent-session-sidebar',
	standalone: true,
	imports: [DatePipe, NgClass],
	templateUrl: './agent-session-sidebar.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentSessionSidebarComponent {
	readonly agent = input.required<Agent>();
	readonly sessions = input.required<readonly AgentSession[]>();
	readonly activeSessionId = input<string | null>(null);
	readonly collapsed = input(false);

	readonly newSession = output<void>();
	readonly selectSession = output<string>();
	readonly toggleCollapsed = output<void>();

	readonly searchQuery = signal('');

	readonly filteredSessions = computed(() => {
		const q = this.searchQuery().trim().toLowerCase();
		const list = this.sessions();
		if (!q) return list;
		return list.filter(
			(s) =>
				s.title.toLowerCase().includes(q) ||
				(s.preview?.toLowerCase().includes(q) ?? false),
		);
	});

	readonly grouped = computed(() => {
		const map: Record<SessionGroup, AgentSession[]> = {
			today: [],
			yesterday: [],
			week: [],
			older: [],
		};
		const now = new Date();
		const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const startYesterday = new Date(startToday);
		startYesterday.setDate(startYesterday.getDate() - 1);
		const weekAgo = new Date(startToday);
		weekAgo.setDate(weekAgo.getDate() - 7);

		for (const s of this.filteredSessions()) {
			const d = new Date(s.updatedAt);
			if (d >= startToday) map.today.push(s);
			else if (d >= startYesterday) map.yesterday.push(s);
			else if (d >= weekAgo) map.week.push(s);
			else map.older.push(s);
		}
		return map;
	});

	protected groupLabel(g: SessionGroup): string {
		switch (g) {
			case 'today':
				return 'Today';
			case 'yesterday':
				return 'Yesterday';
			case 'week':
				return 'Previous 7 days';
			default:
				return 'Older';
		}
	}

	protected readonly groupOrder: SessionGroup[] = ['today', 'yesterday', 'week', 'older'];

	protected modeLabel(m: string): string {
		return m.toUpperCase();
	}

	protected statusColor(status: string): string {
		switch (status) {
			case 'running':
				return 'bg-amber-400';
			case 'failed':
				return 'bg-red-500';
			case 'completed':
				return 'bg-emerald-500';
			case 'archived':
				return 'bg-slate-400';
			default:
				return 'bg-slate-300 dark:bg-slate-600';
		}
	}
}
