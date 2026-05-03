import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { INTERNAL_AGENT_CONFIGS } from '../../core/data/internal-agent-configs';
import type { AgentIntelligenceReadinessRow } from '../../core/models/agent-intelligence.models';
import { AgentIntelligenceApiService } from '../../core/services/agent-intelligence-api.service';
import { environment } from '../../../environments/environment';

const PRIORITY_SLUGS = [
	'fronto',
	'backo',
	'testo',
	'producto',
	'doco',
	'dato',
	'supporto',
	'devopsy',
] as const;

interface ReadinessRow {
	readonly slug: string;
	readonly score: number;
	readonly checks: { readonly label: string; readonly ok: boolean; readonly note?: string }[];
}

@Component({
	selector: 'app-agent-readiness',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './agent-readiness.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentReadinessComponent implements OnInit {
	protected readonly env = environment;
	private readonly intelApi = inject(AgentIntelligenceApiService);
	protected readonly intelBySlug = signal<Record<string, AgentIntelligenceReadinessRow | null>>({});

	protected readonly rows = computed((): ReadinessRow[] =>
		PRIORITY_SLUGS.map((slug) => {
			const cfg = INTERNAL_AGENT_CONFIGS[slug];
			const intel = this.intelBySlug()[slug];
			const checks: ReadinessRow['checks'] = [];
			let pts = 0;
			const add = (ok: boolean, w: number, label: string, note?: string) => {
				if (ok) pts += w;
				checks.push({ label, ok, note });
			};

			add(!!cfg, 12, 'Config present');
			add((cfg?.allowedTools?.length ?? 0) >= 3, 10, 'Tools configured');
			add((cfg?.knowledgeSources?.length ?? 0) >= 2, 8, 'Knowledge sources');
			add((cfg?.requiresApprovalFor?.length ?? 0) >= 0, 6, 'Approval rules reviewed');
			add((cfg?.outputArtifactTypes?.length ?? 0) >= 3, 8, 'Artifact types');
			add(true, 6, 'Mock response path', 'MockAgentBackendService');
			add(
				slug === 'testo' || slug === 'fronto',
				6,
				'Browser / test relevance',
				slug === 'testo' ? 'Test + browser mocks' : 'UI artifacts',
			);
			add(
				!environment.enableMockAgents,
				10,
				'Backend connected',
				environment.enableMockAgents ? 'Still on mock' : 'Live API',
			);
			add(
				environment.enableAgentStreaming,
				5,
				'Streaming enabled',
				environment.enableAgentStreaming ? undefined : 'Off in dev',
			);
			add(true, 4, 'Audit logs', 'Wire when NestJS ships');

			if (intel && !environment.enableMockAgents) {
				add(intel.prompts >= 1, 6, 'Active system prompt (registry)');
				add(intel.skillPacks >= 1, 6, 'Skill packs configured');
				add(intel.workflows >= 1, 6, 'Workflow templates configured');
				add(intel.evalCases >= 1, 6, 'Evaluation cases configured');
				const ev = intel.latestEvaluation;
				add(!!ev && ev.score >= 70, 7, 'Latest evaluation score', ev ? `${ev.score} (${ev.at.slice(0, 10)})` : 'No runs yet');
				const criticalOk = intel.evalCases >= 5;
				add(criticalOk, 4, 'Golden case coverage (5+)', criticalOk ? undefined : 'Add more seed cases');
			} else if (!environment.enableMockAgents) {
				add(false, 0, 'Intelligence registry', 'Loading or unavailable');
			}

			const score = Math.min(100, pts);
			return { slug, score, checks };
		}),
	);

	ngOnInit(): void {
		if (environment.enableMockAgents) return;
		forkJoin(
			PRIORITY_SLUGS.map((slug) =>
				this.intelApi.getReadiness(slug).pipe(
					map((r) => ({ slug, r })),
					catchError(() => of({ slug, r: null as AgentIntelligenceReadinessRow | null })),
				),
			),
		).subscribe((list) => {
			const m: Record<string, AgentIntelligenceReadinessRow | null> = {};
			for (const x of list) m[x.slug] = x.r;
			this.intelBySlug.set(m);
		});
	}
}
