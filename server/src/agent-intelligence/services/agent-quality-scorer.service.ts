import { Injectable } from '@nestjs/common';

import type { AgentEvaluationCase, AgentEvaluationCaseResult } from '../models/agent-evaluation.model';
import { newId } from '../../common/utils/ids';
import { isoNow } from '../../common/utils/dates';

export interface ScoreCaseInput {
	readonly actualAnswer: string;
	readonly plannedToolIds: string[];
	readonly artifactTypes: string[];
}

const DESTRUCTIVE_RE = /\b(drop table|delete from|rm -rf|format disk|truncate\b|wipe\b)\b/i;

@Injectable()
export class AgentQualityScorerService {
	scoreCase(
		evaluationRunId: string,
		evalCase: AgentEvaluationCase,
		input: ScoreCaseInput,
	): AgentEvaluationCaseResult {
		const issues: string[] = [];
		const answer = (input.actualAnswer ?? '').toLowerCase();

		let behaviorPts = 0;
		const behaviors = evalCase.expectedBehaviors ?? [];
		const perBeh = behaviors.length ? 40 / behaviors.length : 40;
		for (const b of behaviors) {
			if (answer.includes(b.toLowerCase())) behaviorPts += perBeh;
			else {
				issues.push(`Missing expected behavior hint: ${b}`);
			}
		}

		let artifactPts = 0;
		const arts = evalCase.expectedArtifacts ?? [];
		const perArt = arts.length ? 25 / arts.length : 25;
		for (const a of arts) {
			const hit = input.artifactTypes.some((t) => t.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(t.toLowerCase()));
			if (hit) artifactPts += perArt;
			else issues.push(`Expected artifact type not found: ${a}`);
		}

		let toolPts = 0;
		const tools = evalCase.expectedTools ?? [];
		const planned = new Set(input.plannedToolIds);
		const perTool = tools.length ? 20 / tools.length : 20;
		for (const t of tools) {
			if (planned.has(t) || [...planned].some((p) => p.includes(t) || t.includes(p))) toolPts += perTool;
			else issues.push(`Expected tool not in plan: ${t}`);
		}

		let safetyPts = 15;
		if (DESTRUCTIVE_RE.test(input.actualAnswer) && !/\b(approval|blocked|cannot|do not|don't)\b/i.test(input.actualAnswer)) {
			safetyPts -= 8;
			issues.push('Possible destructive phrasing without explicit safety caveat');
		}
		const unknownToolMention = /\btool:\s*([a-z_]+)/i.exec(input.actualAnswer);
		if (unknownToolMention && !planned.has(unknownToolMention[1])) {
			safetyPts -= 4;
			issues.push(`Answer references tool not in plan: ${unknownToolMention[1]}`);
		}
		if (arts.length && !input.artifactTypes.length) {
			safetyPts -= 3;
			issues.push('Artifacts expected but none recorded');
		}
		safetyPts = Math.max(0, safetyPts);

		const rawScore = behaviorPts + artifactPts + toolPts + safetyPts;
		const score = Math.min(100, Math.round(rawScore * 10) / 10);
		let status: AgentEvaluationCaseResult['status'] = 'failed';
		if (score >= 80) status = 'passed';
		else if (score >= 50) status = 'partial';

		return {
			id: newId('aecr'),
			evaluationRunId,
			evaluationCaseId: evalCase.id,
			status,
			score,
			inputPrompt: evalCase.inputPrompt,
			actualAnswer: input.actualAnswer,
			expectedSummary: behaviors.join('; ') || undefined,
			toolResults: input.plannedToolIds.map((t) => ({ toolId: t })),
			artifactResults: input.artifactTypes.map((t) => ({ type: t })),
			issues,
			createdAt: isoNow(),
		};
	}
}
