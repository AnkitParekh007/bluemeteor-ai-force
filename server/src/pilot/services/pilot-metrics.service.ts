import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PilotMetricsService {
	constructor(private readonly prisma: PrismaService) {}

	async getMetrics(): Promise<Record<string, unknown>> {
		const [total, avgRow, againRow, timeRow, byAgent, byRole, recent] = await Promise.all([
			this.prisma.pilotFeedback.count(),
			this.prisma.pilotFeedback.aggregate({ _avg: { rating: true } }),
			this.prisma.pilotFeedback.groupBy({
				by: ['wouldUseAgain'],
				_count: { _all: true },
			}),
			this.prisma.pilotFeedback.aggregate({ _sum: { timeSavedMinutes: true } }),
			this.prisma.pilotFeedback.groupBy({
				by: ['agentSlug'],
				_count: { _all: true },
				_avg: { rating: true },
				_sum: { timeSavedMinutes: true },
			}),
			this.prisma.pilotFeedback.groupBy({
				by: ['userRole'],
				_count: { _all: true },
				_avg: { rating: true },
			}),
			this.prisma.pilotFeedback.findMany({
				orderBy: { createdAt: 'desc' },
				take: 120,
				select: {
					whatFailed: true,
					whatWorked: true,
					agentSlug: true,
					userRole: true,
					rating: true,
				},
			}),
		]);

		const wouldAgain = againRow.find((r) => r.wouldUseAgain === true)?._count._all ?? 0;
		const wouldNot = againRow.find((r) => r.wouldUseAgain === false)?._count._all ?? 0;
		const againDenom = wouldAgain + wouldNot;
		const againPct = againDenom ? Math.round((wouldAgain / againDenom) * 1000) / 10 : null;

		const lowRated = byAgent
			.filter((a) => (a._avg.rating ?? 0) < 3.5 && a._count._all >= 1)
			.map((a) => ({ agentSlug: a.agentSlug, avgRating: a._avg.rating, count: a._count._all }));

		const topAgents = [...byAgent].sort((a, b) => b._count._all - a._count._all).slice(0, 8);

		const failureSnippets = recent
			.filter((r) => r.rating <= 2)
			.slice(0, 8)
			.map((r) => ({
				agentSlug: r.agentSlug,
				userRole: r.userRole,
				snippet: r.whatFailed.length > 160 ? `${r.whatFailed.slice(0, 160)}…` : r.whatFailed,
			}));

		const winSnippets = recent
			.filter((r) => r.rating >= 4)
			.slice(0, 8)
			.map((r) => ({
				agentSlug: r.agentSlug,
				userRole: r.userRole,
				snippet: r.whatWorked.length > 160 ? `${r.whatWorked.slice(0, 160)}…` : r.whatWorked,
			}));

		const distinctUsers = await this.prisma.pilotFeedback.groupBy({
			by: ['userId'],
			where: { userId: { not: null } },
		});

		return {
			generatedAt: new Date().toISOString(),
			feedback: {
				totalCount: total,
				averageRating: avgRow._avg.rating != null ? Math.round(avgRow._avg.rating * 100) / 100 : null,
				wouldUseAgainPercent: againPct,
				estimatedTimeSavedMinutesTotal: timeRow._sum.timeSavedMinutes ?? 0,
				estimatedDistinctPilotUsers: distinctUsers.length,
			},
			byAgent: topAgents.map((a) => ({
				agentSlug: a.agentSlug,
				count: a._count._all,
				avgRating: a._avg.rating,
				timeSavedMinutesSum: a._sum.timeSavedMinutes ?? 0,
			})),
			byRole: byRole.map((r) => ({
				userRole: r.userRole,
				count: r._count._all,
				avgRating: r._avg.rating,
			})),
			lowRatedAgents: lowRated,
			topWins: winSnippets,
			topIssues: failureSnippets,
		};
	}
}
