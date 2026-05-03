import { Injectable } from '@nestjs/common';

import { AdminSummaryService } from '../../admin/admin-summary.service';
import { AppConfigService } from '../../config/app-config.service';
import type { ConnectorHealth } from '../../connectors/models/connector.model';
import { ConnectorHealthService } from '../../connectors/services/connector-health.service';
import { McpAdapterService } from '../../internal-tools/services/mcp-adapter.service';
import { ReadinessService } from '../../observability/services/readiness.service';
import { PrismaService } from '../../database/prisma.service';

import type { PilotReadinessCheck } from '../models/pilot-readiness.model';

const PRIORITY = ['fronto', 'testo', 'producto', 'doco'] as const;

@Injectable()
export class PilotReadinessService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly adminSummary: AdminSummaryService,
		private readonly readiness: ReadinessService,
		private readonly connectors: ConnectorHealthService,
		private readonly mcp: McpAdapterService,
		private readonly cfg: AppConfigService,
	) {}

	async getReadinessGate(): Promise<Record<string, unknown>> {
		const summary = await this.adminSummary.getSummary();
		const checks: PilotReadinessCheck[] = [];

		const add = (
			id: string,
			category: string,
			title: string,
			description: string,
			ok: boolean,
			severity: PilotReadinessCheck['severity'],
			recommendation?: string,
		) => {
			checks.push({
				id,
				category,
				title,
				description,
				status: ok ? 'passed' : severity === 'critical' ? 'failed' : 'warning',
				severity,
				recommendation,
			});
		};

		const dbOk = (summary['database'] as { ok?: boolean } | undefined)?.ok === true;
		add('db', 'Critical', 'Database reachable', 'Prisma ping', dbOk, 'critical', 'Verify DATABASE_URL and migrations');

		const prod = summary['productionSafety'] as { ok?: boolean; errorCount?: number } | undefined;
		add('prod_safety', 'Critical', 'Production safety', 'Startup validation', prod?.ok === true, 'critical');

		const rbac = this.cfg.enableRbac;
		add('rbac', 'Critical', 'RBAC enabled', 'Auth configuration', rbac, 'critical');

		const pending = (summary['approvals'] as { pending?: number } | undefined)?.pending ?? 0;
		add('approvals', 'High', 'Approvals subsystem', `${pending} pending`, true, 'high');

		let httpReady = false;
		try {
			const r = await this.readiness.evaluate();
			httpReady = r.status === 'ready';
		} catch {
			httpReady = false;
		}
		add('http_ready', 'Critical', 'HTTP readiness', '/ready aggregate', httpReady, 'critical');

		const agents = (summary['agents'] as { readiness?: { slug: string; score: number }[] } | undefined)?.readiness ?? [];
		const bySlug = new Map(agents.map((a) => [a.slug, a.score]));
		let gateScore = 100;
		for (const slug of PRIORITY) {
			const sc = bySlug.get(slug) ?? 0;
			const ok = sc >= 70;
			if (!ok) gateScore = Math.min(gateScore, 60);
			add(`agent_${slug}`, 'High', `Agent readiness: ${slug}`, `Score ${sc}`, ok, 'high', 'Tune prompts, packs, workflows, evaluations');
		}

		const connectorHealth: ConnectorHealth[] = await this.connectors.getAllHealth().catch(() => []);
		const unhealthy = connectorHealth.filter((c) => c.status === 'unhealthy' || c.status === 'error').length;
		add('connectors', 'Medium', 'Connector health', `${connectorHealth.length} connectors`, unhealthy === 0, 'medium');

		const mcpSnap = await this.mcp.getHealthSnapshot().catch(() => ({ configuredServers: 0, runningServers: 0 }));
		add('mcp', 'Medium', 'MCP snapshot', `configured ${mcpSnap.configuredServers}`, true, 'medium');

		const failedRuns = (summary['runs'] as { failedToday?: number })?.failedToday ?? 0;
		add('runs', 'High', 'Failed runs today', String(failedRuns), failedRuns < 20, 'high');

		let feedbackTableOk = true;
		try {
			await this.prisma.pilotFeedback.count();
		} catch {
			feedbackTableOk = false;
		}
		add('pilot_feedback', 'High', 'Pilot feedback table', 'Prisma pilot_feedback', feedbackTableOk, 'high');

		const criticalFailed = checks.filter((c) => c.severity === 'critical' && c.status !== 'passed');
		const highFailed = checks.filter((c) => c.severity === 'high' && c.status !== 'passed');
		let gate: 'ready' | 'ready_with_warnings' | 'not_ready' = 'ready';
		if (criticalFailed.length) gate = 'not_ready';
		else if (highFailed.length || gateScore < 70) gate = 'ready_with_warnings';

		return {
			generatedAt: new Date().toISOString(),
			gate,
			gateScore,
			checks,
			adminSummarySnippet: {
				users: summary['users'],
				agents: summary['agents'],
				approvals: summary['approvals'],
				runs: summary['runs'],
				tools: summary['tools'],
				evaluations: summary['evaluations'],
			},
		};
	}
}
