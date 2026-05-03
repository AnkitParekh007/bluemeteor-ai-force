import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { AiProviderRouterService } from '../../providers/services/ai-provider-router.service';
import { RuntimeMetricsService } from './runtime-metrics.service';

@Injectable()
export class MetricsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly cfg: AppConfigService,
		private readonly router: AiProviderRouterService,
		private readonly runtime: RuntimeMetricsService,
	) {}

	async snapshot(): Promise<Record<string, unknown>> {
		const [runGroups, toolGroups, approvalGroups, ragDocs, recentFailedRuns, pendingApprovals] =
			await Promise.all([
			this.prisma.agentRun.groupBy({ by: ['status'], _count: { _all: true } }).catch(() => []),
			this.prisma.agentToolCall.groupBy({ by: ['status'], _count: { _all: true } }).catch(() => []),
			this.prisma.agentApproval.groupBy({ by: ['status'], _count: { _all: true } }).catch(() => []),
			this.prisma.ragDocument.count().catch(() => 0),
			this.prisma.agentRun
				.findMany({
					where: { status: 'failed' },
					orderBy: { createdAt: 'desc' },
					take: 10,
					select: { id: true, agentSlug: true, traceId: true, createdAt: true, error: true },
				})
				.catch(() => []),
			this.prisma.agentApproval.count({ where: { status: 'pending' } }).catch(() => 0),
		]);

		const runsByStatus: Record<string, number> = {};
		for (const g of runGroups as { status: string; _count: { _all: number } }[]) {
			runsByStatus[g.status] = g._count._all;
		}

		const toolsByStatus: Record<string, number> = {};
		for (const g of toolGroups as { status: string; _count: { _all: number } }[]) {
			toolsByStatus[g.status] = g._count._all;
		}

		const approvalsByStatus: Record<string, number> = {};
		for (const g of approvalGroups as { status: string; _count: { _all: number } }[]) {
			approvalsByStatus[g.status] = g._count._all;
		}

		const totalRuns = Object.values(runsByStatus).reduce((a, b) => a + b, 0);

		return {
			generatedAt: new Date().toISOString(),
			agentRuns: {
				total: totalRuns,
				byStatus: runsByStatus,
			},
			toolExecutions: {
				byStatus: toolsByStatus,
			},
			approvals: {
				pending: pendingApprovals,
				byStatus: approvalsByStatus,
			},
			rag: {
				documentCount: ragDocs,
			},
			provider: {
				active: this.cfg.agentProvider,
				health: this.router.getProviderHealth(),
			},
			recentFailedRuns: recentFailedRuns.map((r) => ({
				id: r.id,
				agentSlug: r.agentSlug,
				traceId: r.traceId,
				createdAt: r.createdAt.toISOString(),
				error: r.error ? String(r.error).slice(0, 200) : null,
			})),
			runtime: this.runtime.snapshot(),
			note: 'Averages and connector/MCP/browser counters are extended incrementally; see docs/observability.md.',
		};
	}
}
