import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { INTERNAL_AGENT_CONFIGS } from '../../../core/data/internal-agent-configs';
import type { AgentIntelligenceReadinessRow } from '../../../core/models/agent-intelligence.models';
import { environment } from '../../../../environments/environment';
import { AgentIntelligenceApiService } from '../../../core/services/agent-intelligence-api.service';
import { ADMIN_PRIORITY_AGENT_SLUGS } from '../admin.constants';
import { AdminSectionHeaderComponent } from '../components/admin-section-header.component';

@Component({
	selector: 'app-readiness-admin',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, AdminSectionHeaderComponent],
	templateUrl: './readiness-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadinessAdminComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly intel = inject(AgentIntelligenceApiService);

	protected readonly slugs = [...ADMIN_PRIORITY_AGENT_SLUGS];
	protected focusSlug = 'fronto';
	protected readonly intelBySlug = signal<Record<string, AgentIntelligenceReadinessRow | null>>({});

	protected readonly tableRows = computed(() => {
		return this.slugs.map((slug) => {
			const cfg = INTERNAL_AGENT_CONFIGS[slug];
			const intel = this.intelBySlug()[slug];
			let score = 50;
			if (cfg) score += 10;
			if (intel) {
				if (intel.prompts >= 1) score += 8;
				if (intel.skillPacks >= 1) score += 8;
				if (intel.workflows >= 1) score += 8;
				if (intel.evalCases >= 1) score += 8;
				if (intel.latestEvaluation?.score != null) score += 8;
			}
			score = Math.min(100, score);
			return { slug, score, intel, department: cfg?.department ?? '—' };
		});
	});

	ngOnInit(): void {
		this.route.queryParamMap.subscribe((q) => {
			const a = q.get('agent');
			if (a && this.slugs.includes(a as (typeof ADMIN_PRIORITY_AGENT_SLUGS)[number])) {
				this.focusSlug = a;
			}
		});
		this.reload();
	}

	protected reload(): void {
		if (environment.enableMockAgents) {
			const mock: Record<string, AgentIntelligenceReadinessRow | null> = {};
			for (const s of this.slugs) {
				mock[s] = { agentSlug: s, prompts: 0, skillPacks: 0, workflows: 0, evalCases: 0, latestEvaluation: null };
			}
			this.intelBySlug.set(mock);
			return;
		}
		const reqs = Object.fromEntries(
			this.slugs.map((slug) => [
				slug,
				this.intel.getReadiness(slug).pipe(catchError(() => of(null))),
			]),
		) as Record<string, ReturnType<AgentIntelligenceApiService['getReadiness']>>;
		forkJoin(reqs).subscribe((res) => {
			this.intelBySlug.set(res as Record<string, AgentIntelligenceReadinessRow | null>);
		});
	}

	protected band(score: number): 'ok' | 'warn' | 'bad' {
		if (score >= 80) return 'ok';
		if (score >= 60) return 'warn';
		return 'bad';
	}

	protected focusIntel(): AgentIntelligenceReadinessRow | null {
		return this.intelBySlug()[this.focusSlug] ?? null;
	}
}
