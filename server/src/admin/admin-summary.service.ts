import { Injectable } from '@nestjs/common';

import { AgentConfigRegistryService } from '../agents/services/agent-config-registry.service';
import { AppConfigService } from '../config/app-config.service';
import { StartupValidationService } from '../config/startup-validation.service';
import { ConnectorHealthService } from '../connectors/services/connector-health.service';
import { PrismaService } from '../database/prisma.service';
import { McpAdapterService } from '../internal-tools/services/mcp-adapter.service';
import { AiProviderRouterService } from '../providers/services/ai-provider-router.service';

@Injectable()
export class AdminSummaryService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly cfg: AppConfigService,
		private readonly registry: AgentConfigRegistryService,
		private readonly router: AiProviderRouterService,
		private readonly connectors: ConnectorHealthService,
		private readonly mcp: McpAdapterService,
		private readonly startup: StartupValidationService,
	) {}

	async getSummary(): Promise<Record<string, unknown>> {
		const start = new Date();
		start.setHours(0, 0, 0, 0);

		const [
			userTotal,
			userActive,
			pendingApprovals,
			failedRunsToday,
			failedToolsToday,
			evalAgg,
			recentAudit,
		] = await Promise.all([
			this.prisma.user.count().catch(() => 0),
			this.prisma.user.count({ where: { status: 'active' } }).catch(() => 0),
			this.prisma.agentApproval.count({ where: { status: 'pending' } }).catch(() => 0),
			this.prisma.agentRun
				.count({ where: { status: 'failed', createdAt: { gte: start } } })
				.catch(() => 0),
			this.prisma.agentToolCall
				.count({
					where: {
						status: 'failed',
						OR: [{ completedAt: { gte: start } }, { startedAt: { gte: start } }],
					},
				})
				.catch(() => 0),
			this.prisma.agentEvaluationRun
				.aggregate({
					_avg: { score: true },
					where: { status: 'completed' },
				})
				.catch(() => ({ _avg: { score: null as number | null } })),
			this.prisma.agentAuditLog
				.findMany({
					orderBy: { createdAt: 'desc' },
					take: 8,
					select: {
						id: true,
						action: true,
						agentSlug: true,
						runId: true,
						actorEmail: true,
						createdAt: true,
					},
				})
				.catch(() => []),
		]);

		const priority = this.registry.getPriorityReadinessSummary();
		const readyAgents = priority.agents.filter((a) => a.score >= 80).length;

		const connectorHealth = await this.connectors.getAllHealth().catch(() => []);
		const mcpSnap = await this.mcp.getHealthSnapshot().catch(() => ({
			configuredServers: 0,
			runningServers: 0,
		}));

		const dbOk = await this.prisma.$queryRaw`SELECT 1`.then(
			() => true,
			() => false,
		);

		const sync = this.startup.evaluateSync();

		return {
			generatedAt: new Date().toISOString(),
			users: { total: userTotal, active: userActive },
			agents: {
				priorityCount: priority.agents.length,
				readyCount: readyAgents,
				readiness: priority.agents,
			},
			runs: { failedToday: failedRunsToday },
			tools: { failedExecutionsToday: failedToolsToday },
			approvals: { pending: pendingApprovals },
			evaluations: { averageScore: evalAgg._avg.score ?? null },
			connectors: {
				summary: connectorHealth.map((c) => ({
					id: c.connectorId,
					status: c.status,
					message: c.message,
				})),
			},
			mcp: {
				enabled: this.cfg.enableMcpAdapter,
				configuredServers: mcpSnap.configuredServers,
				runningServers: mcpSnap.runningServers,
			},
			provider: { active: this.cfg.agentProvider, health: this.router.getProviderHealth() },
			database: { ok: dbOk },
			productionSafety: {
				ok: sync.ok,
				warningCount: sync.warnings.length,
				errorCount: sync.errors.length,
			},
			recentActivity: recentAudit.map((r) => ({
				id: r.id,
				action: r.action,
				agentSlug: r.agentSlug,
				runId: r.runId,
				actorEmail: r.actorEmail,
				createdAt: r.createdAt.toISOString(),
			})),
		};
	}

	getAgentsSummary(): Record<string, unknown> {
		const priority = this.registry.getPriorityReadinessSummary();
		const agents = priority.agents.map((p) => {
			const cfg = this.registry.getConfig(p.slug);
			return {
				slug: p.slug,
				displayName: cfg?.displayName ?? p.slug,
				readinessScore: p.score,
				checks: p.checks,
				department: cfg?.department ?? null,
				defaultMode: cfg?.defaultMode ?? null,
				allowedToolsCount: cfg?.allowedTools.filter((t) => t.enabled).length ?? 0,
				deniedToolsCount: cfg?.deniedTools.length ?? 0,
				knowledgeSourcesCount: cfg?.knowledgeSources.length ?? 0,
				requiresApprovalRules: cfg?.requiresApprovalFor.length ?? 0,
			};
		});
		return { generatedAt: new Date().toISOString(), agents };
	}

	async listApprovals(params: {
		readonly status?: string;
		readonly limit: number;
	}): Promise<unknown[]> {
		const lim = Math.min(200, Math.max(1, params.limit));
		const rows = await this.prisma.agentApproval.findMany({
			where: params.status ? { status: params.status } : undefined,
			orderBy: { createdAt: 'desc' },
			take: lim,
			include: {
				run: { select: { sessionId: true, agentSlug: true, traceId: true } },
			},
		});
		return rows.map((r) => {
			const raw = r.payloadJson ?? '{}';
			const preview = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
			return {
				id: r.id,
				runId: r.runId,
				sessionId: r.run.sessionId,
				agentSlug: r.run.agentSlug,
				traceId: r.run.traceId,
				title: r.title,
				description: r.description,
				riskLevel: r.riskLevel,
				actionType: r.actionType,
				status: r.status,
				createdAt: r.createdAt.toISOString(),
				resolvedAt: r.resolvedAt?.toISOString() ?? null,
				requestedByUserId: r.requestedByUserId,
				resolvedByUserId: r.resolvedByUserId,
				resolvedByEmail: r.resolvedByEmail,
				payloadPreview: preview,
			};
		});
	}
}
