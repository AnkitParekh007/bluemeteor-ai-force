import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { INTERNAL_AGENT_CONFIGS } from '../../core/data/internal-agent-configs';
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
export class AgentReadinessComponent {
	protected readonly env = environment;

	protected readonly rows = computed((): ReadinessRow[] =>
		PRIORITY_SLUGS.map((slug) => {
			const cfg = INTERNAL_AGENT_CONFIGS[slug];
			const checks: ReadinessRow['checks'] = [];
			let pts = 0;
			const add = (ok: boolean, w: number, label: string, note?: string) => {
				if (ok) pts += w;
				checks.push({ label, ok, note });
			};

			add(!!cfg, 15, 'Config present');
			add((cfg?.allowedTools?.length ?? 0) >= 3, 12, 'Tools configured');
			add((cfg?.knowledgeSources?.length ?? 0) >= 2, 10, 'Knowledge sources');
			add((cfg?.requiresApprovalFor?.length ?? 0) >= 0, 8, 'Approval rules reviewed');
			add((cfg?.outputArtifactTypes?.length ?? 0) >= 3, 10, 'Artifact types');
			add(true, 10, 'Mock response path', 'MockAgentBackendService');
			add(
				slug === 'testo' || slug === 'fronto',
				8,
				'Browser / test relevance',
				slug === 'testo' ? 'Test + browser mocks' : 'UI artifacts',
			);
			add(
				!environment.enableMockAgents,
				15,
				'Backend connected',
				environment.enableMockAgents ? 'Still on mock' : 'Live API',
			);
			add(
				environment.enableAgentStreaming,
				7,
				'Streaming enabled',
				environment.enableAgentStreaming ? undefined : 'Off in dev',
			);
			add(true, 5, 'Audit logs', 'Wire when NestJS ships');

			const score = Math.min(100, pts);
			return { slug, score, checks };
		}),
	);
}
