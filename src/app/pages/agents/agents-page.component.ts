import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';

import { getAgentCardImage, type AgentCardImageMeta } from '../../core/data/agent-card-images';
import { MOCK_AGENTS } from '../../core/data/mock-agents';
import type { AgentCategory } from '../../core/models/agent.models';
import { AuthStore } from '../../core/services/auth.store';

type DeptKey = 'all' | AgentCategory;

@Component({
	selector: 'app-agents-page',
	standalone: true,
	imports: [RouterLink, IconField, InputIcon, InputText],
	templateUrl: './agents-page.component.html',
})
export class AgentsPageComponent {
	private readonly auth = inject(AuthStore);

	private static readonly DEPT_ORDER: readonly AgentCategory[] = [
		'engineering',
		'product',
		'leadership',
		'operations',
		'support',
		'knowledge',
		'finance',
	];

	private static readonly DEPT_LABEL: Record<AgentCategory, string> = {
		engineering: 'Engineering',
		product: 'Product',
		leadership: 'Leadership',
		operations: 'Operations',
		support: 'Support',
		knowledge: 'Knowledge',
		finance: 'Finance',
	};

	protected readonly searchQuery = signal('');
	protected readonly selectedDept = signal<DeptKey>('all');

	private readonly catalogAgents = computed(() =>
		MOCK_AGENTS.filter((a) => this.auth.canAccessAgent(a.slug, 'view')),
	);

	protected readonly departmentOptions = computed(() => {
		const agents = this.catalogAgents();
		const byCat = new Map<AgentCategory, number>();
		for (const c of AgentsPageComponent.DEPT_ORDER) {
			byCat.set(c, 0);
		}
		for (const a of agents) {
			byCat.set(a.category, (byCat.get(a.category) ?? 0) + 1);
		}

		const rows: { id: DeptKey; label: string; count: number }[] = [
			{ id: 'all', label: 'All', count: agents.length },
		];
		for (const c of AgentsPageComponent.DEPT_ORDER) {
			const n = byCat.get(c) ?? 0;
			if (n > 0) {
				rows.push({
					id: c,
					label: AgentsPageComponent.DEPT_LABEL[c],
					count: n,
				});
			}
		}
		return rows;
	});

	protected readonly filteredAgents = computed(() => {
		let list = [...this.catalogAgents()];
		const d = this.selectedDept();
		if (d !== 'all') {
			list = list.filter((a) => a.category === d);
		}
		const q = this.searchQuery().trim().toLowerCase();
		if (q) {
			list = list.filter((a) => {
				const blob = [
					a.name,
					a.roleTitle,
					a.shortDescription,
					a.slug,
					a.categoryLabel,
					a.heroTagline,
					...a.tools,
					...a.relatedKeywords,
				]
					.join(' ')
					.toLowerCase();
				return blob.includes(q);
			});
		}
		return list;
	});

	protected onSearchInput(event: Event): void {
		const v = (event.target as HTMLInputElement).value;
		this.searchQuery.set(v);
	}

	protected selectDept(id: DeptKey): void {
		this.selectedDept.set(id);
	}

	protected cardImage(slug: string): AgentCardImageMeta | undefined {
		return getAgentCardImage(slug);
	}

	protected deptButtonClass(id: DeptKey): string {
		const base =
			'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors';
		const selected = this.selectedDept() === id;
		if (selected) {
			return `${base} border-teal-400/55 bg-cyan-50 text-slate-900 shadow-sm shadow-cyan-500/10 ring-1 ring-teal-400/25 dark:border-cyan-400/45 dark:bg-cyan-950/40 dark:text-white dark:shadow-cyan-900/30 dark:ring-cyan-400/25`;
		}
		return `${base} border-transparent text-slate-700 hover:bg-violet-50/80 dark:text-slate-300 dark:hover:bg-indigo-950/50`;
	}

	protected categoryChipClass(cat: string): string {
		const base =
			'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1';
		switch (cat) {
			case 'engineering':
				return `${base} bg-teal-100 text-teal-800 ring-teal-400/30 dark:bg-teal-950/70 dark:text-teal-200 dark:ring-teal-500/35`;
			case 'product':
				return `${base} bg-violet-100 text-violet-900 ring-violet-400/25 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-500/30`;
			case 'leadership':
				return `${base} bg-indigo-100 text-indigo-900 ring-indigo-400/25 dark:bg-indigo-950/65 dark:text-indigo-200 dark:ring-indigo-500/35`;
			case 'operations':
				return `${base} bg-orange-100 text-orange-900 ring-orange-400/25 dark:bg-orange-950/45 dark:text-orange-100`;
			case 'support':
				return `${base} bg-sky-100 text-sky-900 ring-sky-400/25 dark:bg-sky-950/55 dark:text-sky-200`;
			case 'knowledge':
				return `${base} bg-cyan-100 text-cyan-900 ring-cyan-400/30 dark:bg-cyan-950/60 dark:text-cyan-100`;
			case 'finance':
				return `${base} bg-emerald-100 text-emerald-900 ring-emerald-400/25 dark:bg-emerald-950/50 dark:text-emerald-200`;
			default:
				return `${base} bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-200`;
		}
	}
}
