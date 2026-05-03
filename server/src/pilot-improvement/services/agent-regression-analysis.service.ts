import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

export interface AgentQualitySnapshot {
	agentSlug: string;
	latestScore: number | null;
	previousScore: number | null;
	scoreDelta: number | null;
	latestRunId: string | null;
	previousRunId: string | null;
	latestRunAt: string | null;
	totalCases: number;
	passedCases: number;
	failedCases: number;
}

export interface RegressionComparison {
	agentSlug: string;
	previousRunId: string;
	latestRunId: string;
	previousScore: number;
	latestScore: number;
	scoreDelta: number;
	improved: boolean;
	regressed: boolean;
	improvedCaseIds: string[];
	regressedCaseIds: string[];
	unresolvedIssueCount: number;
	recommendation: string;
}

@Injectable()
export class AgentRegressionAnalysisService {
	constructor(private readonly prisma: PrismaService) {}

	async getAgentQualitySnapshot(agentSlug: string): Promise<AgentQualitySnapshot> {
		const runs = await this.prisma.agentEvaluationRun.findMany({
			where: { agentSlug, status: 'completed' },
			orderBy: { startedAt: 'desc' },
			take: 2,
		});

		const latest = runs[0] ?? null;
		const previous = runs[1] ?? null;

		const latestScore = latest?.score ?? null;
		const previousScore = previous?.score ?? null;
		const scoreDelta =
			latestScore != null && previousScore != null
				? Math.round((latestScore - previousScore) * 100) / 100
				: null;

		return {
			agentSlug,
			latestScore,
			previousScore,
			scoreDelta,
			latestRunId: latest?.id ?? null,
			previousRunId: previous?.id ?? null,
			latestRunAt: latest?.startedAt?.toISOString() ?? null,
			totalCases: latest?.totalCases ?? 0,
			passedCases: latest?.passedCases ?? 0,
			failedCases: latest?.failedCases ?? 0,
		};
	}

	async compareEvaluationRuns(
		previousRunId: string,
		latestRunId: string,
	): Promise<RegressionComparison | null> {
		const [prev, latest] = await Promise.all([
			this.prisma.agentEvaluationRun.findUnique({ where: { id: previousRunId } }),
			this.prisma.agentEvaluationRun.findUnique({ where: { id: latestRunId } }),
		]);

		if (!prev || !latest) return null;

		const [prevResults, latestResults] = await Promise.all([
			this.prisma.agentEvaluationCaseResult.findMany({
				where: { evaluationRunId: previousRunId },
				select: { evaluationCaseId: true, status: true },
			}),
			this.prisma.agentEvaluationCaseResult.findMany({
				where: { evaluationRunId: latestRunId },
				select: { evaluationCaseId: true, status: true },
			}),
		]);

		const prevMap = new Map(prevResults.map((r) => [r.evaluationCaseId, r.status]));
		const latestMap = new Map(latestResults.map((r) => [r.evaluationCaseId, r.status]));

		const improvedCaseIds: string[] = [];
		const regressedCaseIds: string[] = [];

		for (const [caseId, latestStatus] of latestMap) {
			const prevStatus = prevMap.get(caseId);
			if (prevStatus === 'failed' && latestStatus === 'passed') improvedCaseIds.push(caseId);
			if (prevStatus === 'passed' && latestStatus === 'failed') regressedCaseIds.push(caseId);
		}

		const unresolvedIssueCount = latestResults.filter((r) => r.status === 'failed').length;
		const scoreDelta = Math.round((latest.score - prev.score) * 100) / 100;

		const recommendation =
			scoreDelta > 5
				? 'Score improved significantly. Consider validating open backlog items.'
				: scoreDelta < -5
					? 'Score regressed. Review recently applied changes and create new backlog items.'
					: unresolvedIssueCount > 0
						? `Score stable but ${unresolvedIssueCount} cases still failing. Address open backlog items.`
						: 'Score stable with no regressions. Continue monitoring.';

		return {
			agentSlug: latest.agentSlug,
			previousRunId,
			latestRunId,
			previousScore: prev.score,
			latestScore: latest.score,
			scoreDelta,
			improved: scoreDelta > 0,
			regressed: scoreDelta < 0,
			improvedCaseIds,
			regressedCaseIds,
			unresolvedIssueCount,
			recommendation,
		};
	}

	async summariseImprovement(agentSlug: string): Promise<Record<string, unknown>> {
		const snapshot = await this.getAgentQualitySnapshot(agentSlug);
		if (!snapshot.latestRunId || !snapshot.previousRunId) {
			return {
				agentSlug,
				message: 'Not enough evaluation runs to compare. Run evaluation at least twice.',
				snapshot,
			};
		}

		const comparison = await this.compareEvaluationRuns(
			snapshot.previousRunId,
			snapshot.latestRunId,
		);

		return { agentSlug, snapshot, comparison };
	}
}
