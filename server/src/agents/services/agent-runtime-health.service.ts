import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { AiProviderRouterService } from '../../providers/services/ai-provider-router.service';

@Injectable()
export class AgentRuntimeHealthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly config: AppConfigService,
		private readonly router: AiProviderRouterService,
	) {}

	async getSnapshot(): Promise<Record<string, unknown>> {
		const [totalSessions, totalRuns, totalArtifacts, totalEvents, ragDocumentCount] = await Promise.all([
			this.prisma.agentSession.count(),
			this.prisma.agentRun.count(),
			this.prisma.agentArtifact.count(),
			this.prisma.agentRuntimeEvent.count(),
			this.prisma.ragDocument.count(),
		]);
		return {
			activeProvider: this.router.getActiveProviderName(),
			providerHealth: this.router.getProviderHealth(),
			database: { ok: true, connected: true },
			totalSessions,
			totalRuns,
			totalArtifacts,
			totalEvents,
			ragDocumentCount,
			streamingEnabled: this.config.streamingEnabled,
			approvalGatesEnabled: this.config.enableApprovalGates,
		};
	}
}
