import { Module, forwardRef } from '@nestjs/common';

import { AgentCoreModule } from './agent-core.module';
import { AuditController } from './audit.controller';
import { AgentsController } from './agents.controller';
import { AgentApprovalRepository } from './repositories/agent-approval.repository';
import { AgentArtifactRepository } from './repositories/agent-artifact.repository';
import { AgentAuditRepository } from './repositories/agent-audit.repository';
import { AgentEventRepository } from './repositories/agent-event.repository';
import { AgentMessageRepository } from './repositories/agent-message.repository';
import { AgentRunRepository } from './repositories/agent-run.repository';
import { AgentSessionRepository } from './repositories/agent-session.repository';
import { AgentApprovalService } from './services/agent-approval.service';
import { AgentArtifactService } from './services/agent-artifact.service';
import { AgentAuditLogService } from './services/agent-audit-log.service';
import { AgentEventBusService } from './services/agent-event-bus.service';
import { AgentContextBuilderService } from './services/agent-context-builder.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { AgentRuntimeHealthService } from './services/agent-runtime-health.service';
import { AgentRunService } from './services/agent-run.service';
import { AgentSessionService } from './services/agent-session.service';
import { AuthModule } from '../auth/auth.module';
import { BrowserModule } from '../browser/browser.module';
import { RagModule } from '../rag/rag.module';
import { ProvidersModule } from '../providers/providers.module';
import { TestingModule } from '../testing/testing.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
	imports: [
		AgentCoreModule,
		AuthModule,
		RagModule,
		ProvidersModule,
		forwardRef(() => ToolsModule),
		BrowserModule,
		TestingModule,
	],
	controllers: [AgentsController, AuditController],
	providers: [
		AgentSessionRepository,
		AgentMessageRepository,
		AgentRunRepository,
		AgentArtifactRepository,
		AgentEventRepository,
		AgentApprovalRepository,
		AgentAuditRepository,
		AgentSessionService,
		AgentRunService,
		AgentArtifactService,
		AgentApprovalService,
		AgentEventBusService,
		AgentAuditLogService,
		AgentContextBuilderService,
		AgentOrchestratorService,
		AgentRuntimeHealthService,
	],
	exports: [
		AgentSessionService,
		AgentOrchestratorService,
		AgentApprovalService,
		AgentEventBusService,
		AgentArtifactService,
		AgentRunService,
		AgentAuditLogService,
	],
})
export class AgentsModule {}
