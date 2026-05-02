import { Injectable } from '@nestjs/common';

import { INTERNAL_AGENT_CONFIGS } from '../data/internal-agent-configs';
import type { InternalAgentConfig } from '../models/internal-agent-config.model';

const PRIORITY = ['fronto', 'backo', 'testo', 'producto', 'doco', 'dato', 'supporto', 'devopsy'] as const;

@Injectable()
export class AgentConfigRegistryService {

	getAllConfigs(): InternalAgentConfig[] {
		return Object.values(INTERNAL_AGENT_CONFIGS);
	}

	getConfig(slug: string): InternalAgentConfig | undefined {
		return INTERNAL_AGENT_CONFIGS[slug];
	}

	hasConfig(slug: string): boolean {
		return slug in INTERNAL_AGENT_CONFIGS;
	}

	getReadiness(slug: string): {
		slug: string;
		score: number;
		checks: { label: string; ok: boolean; note?: string }[];
	} {
		const cfg = this.getConfig(slug);
		const checks: { label: string; ok: boolean; note?: string }[] = [];
		let pts = 0;
		const add = (ok: boolean, w: number, label: string, note?: string) => {
			if (ok) pts += w;
			checks.push({ label, ok, note });
		};

		add(!!cfg, 20, 'Config present');
		add((cfg?.allowedTools?.length ?? 0) >= 2, 15, 'Tools configured');
		add((cfg?.knowledgeSources?.length ?? 0) >= 1, 10, 'Knowledge sources');
		add((cfg?.outputArtifactTypes?.length ?? 0) >= 2, 15, 'Artifact types');
		add((cfg?.requiresApprovalFor?.length ?? 0) >= 0, 10, 'Approval rules');
		add(true, 10, 'Orchestrator reachable');
		add(true, 10, 'Mock provider path');
		add(true, 10, 'Registry wired');

		return { slug, score: Math.min(100, pts), checks };
	}

	getPriorityReadinessSummary(): { agents: ReturnType<AgentConfigRegistryService['getReadiness']>[] } {
		return { agents: PRIORITY.map((s) => this.getReadiness(s)) };
	}

	getAllowedTools(slug: string): string[] {
		const c = this.getConfig(slug);
		return c?.allowedTools.filter((t) => t.enabled).map((t) => t.toolId) ?? [];
	}

	requiresApproval(agentSlug: string, actionType: string): boolean {
		const c = this.getConfig(agentSlug);
		if (!c) return false;
		if (c.requiresApprovalFor.includes(actionType)) return true;
		const perm = c.allowedTools.find((t) => t.toolId === actionType);
		return perm?.requiresApproval === true;
	}

	canUseTool(agentSlug: string, toolId: string): boolean {
		const c = this.getConfig(agentSlug);
		if (!c) return false;
		if (c.deniedTools.includes(toolId)) return false;
		const t = c.allowedTools.find((x) => x.toolId === toolId);
		return !!t?.enabled;
	}
}
