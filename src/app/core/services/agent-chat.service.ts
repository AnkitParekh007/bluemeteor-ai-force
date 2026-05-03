import { Injectable } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import type { Agent } from '../models/agent.models';
import type {
	AgentArtifact,
	AgentMode,
	AgentRunRequest,
	AgentRunResponse,
} from '../models/agent-chat.models';
import { MOCK_AGENTS } from '../data/mock-agents';

function agentBySlug(slug: string): Agent | undefined {
	return MOCK_AGENTS.find((a) => a.slug === slug);
}

function id(prefix: string): string {
	const r =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	return `${prefix}-${r}`;
}

@Injectable({ providedIn: 'root' })
export class AgentChatService {
	private readonly latencyMs = { min: 450, max: 1100 };

	sendMessage(request: AgentRunRequest): Observable<AgentRunResponse> {
		const trimmed = request.message.trim();
		if (!trimmed) {
			return throwError(() => new Error('Message is empty'));
		}

		const agent = agentBySlug(request.agentSlug);
		if (!agent) {
			return throwError(() => new Error('Unknown agent'));
		}

		const delay =
			this.latencyMs.min +
			Math.floor(Math.random() * (this.latencyMs.max - this.latencyMs.min));

		return timer(delay).pipe(
			switchMap(() => of(this.buildMockResponse(agent, request))),
		);
	}

	private buildMockResponse(agent: Agent, req: AgentRunRequest): AgentRunResponse {
		const mode: AgentMode = req.mode;
		const preview =
			req.message.length > 220 ? `${req.message.slice(0, 220)}…` : req.message;

		const baseIntro = `Hi — I'm ${agent.name} (${agent.roleTitle}). `;

		let modeLine = '';
		if (mode === 'ask') {
			modeLine =
				"In **Ask** mode I'll explain tradeoffs, risks, and options without assuming we're executing changes yet.\n\n";
		} else if (mode === 'plan') {
			modeLine =
				"In **Plan** mode I'll structure assumptions, milestones, owners, and verification steps.\n\n";
		} else {
			modeLine =
				"In **Act** mode I'll draft concrete deliverables (checklists, snippets, run steps) you can hand to the team.\n\n";
		}

		const body = `${baseIntro}${modeLine}Here's how I'd respond to your request:\n\n` +
			`> ${preview}\n\n` +
			this.modeSpecificBody(agent, mode, req.message);

		const artifacts = this.buildArtifacts(agent, mode, req.message);
		const suggestedActions = this.suggestedChips(agent, mode);

		return {
			message: body,
			artifacts: artifacts.length ? artifacts : undefined,
			suggestedActions,
		};
	}

	private modeSpecificBody(agent: Agent, mode: AgentMode, message: string): string {
		const lower = message.toLowerCase();
		const toolHint =
			agent.tools.slice(0, 3).join(', ') || 'your core toolkit';

		if (mode === 'act') {
			return (
				`### Next steps (draft)\n` +
				`1. Confirm scope with the requester (2 bullets max).\n` +
				`2. Pull any logs/metrics relevant to: "${lower.slice(0, 60)}…".\n` +
				`3. Produce a minimal artifact (doc snippet or checklist) using ${toolHint}.\n` +
				`4. Schedule a 15m review with stakeholders.\n`
			);
		}
		if (mode === 'plan') {
			return (
				`### Plan outline\n` +
				`- **Goal:** address the intent behind your message.\n` +
				`- **Assumptions:** environment mirrors prod patterns; access is available.\n` +
				`- **Workstreams:** discovery → implementation → validation.\n` +
				`- **Risks:** scope creep, missing telemetry, dependency lead time.\n` +
				`- **Exit criteria:** measurable signal that the change worked.\n`
			);
		}
		return (
			`### Answer sketch\n` +
			`I'll anchor this in **${agent.categoryLabel}** practice areas and your stated stack (${toolHint}). ` +
			`If you want this promoted to a plan or executable checklist, switch to **Plan** or **Act**.\n`
		);
	}

	private buildArtifacts(agent: Agent, mode: AgentMode, message: string): AgentArtifact[] {
		const now = new Date();
		const artifacts: AgentArtifact[] = [];

		artifacts.push({
			id: id('art'),
			title: `${mode.toUpperCase()} summary`,
			type: 'markdown',
			content:
				`# ${agent.name} — ${agent.roleTitle}\n\n` +
				`**Focus:** ${agent.heroTagline}\n\n` +
				`**User request excerpt:** ${message.slice(0, 400)}${message.length > 400 ? '…' : ''}\n`,
			createdAt: now,
		});

		if (mode === 'act') {
			artifacts.push({
				id: id('chk'),
				title: 'Execution checklist',
				type: 'checklist',
				content:
					`- [ ] Validate assumptions with owner\n` +
					`- [ ] Capture baseline metrics\n` +
					`- [ ] Implement smallest viable change\n` +
					`- [ ] Run smoke checks\n` +
					`- [ ] Document rollback\n`,
				createdAt: now,
			});
		}

		return artifacts;
	}

	private suggestedChips(agent: Agent, mode: AgentMode): string[] {
		const generic = [
			`Summarize risks for ${agent.categoryLabel} rollout`,
			'Draft stakeholder update (5 bullets)',
			'List verification steps for the next PR',
		];
		const plan = [
			'Turn last answer into a milestone plan',
			'Add RACI for each milestone',
			'Define rollback triggers',
		];
		const act = [
			'Produce copy-paste runbook commands',
			'Draft SQL/migration sketch',
			'Generate QA checklist for release',
		];
		if (mode === 'plan') return plan;
		if (mode === 'act') return act;
		return generic;
	}
}
