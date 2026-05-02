import { Module, forwardRef } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { AgentCoreModule } from '../agents/agent-core.module';
import { AuthModule } from '../auth/auth.module';
import { BrowserModule } from '../browser/browser.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { InternalToolsModule } from '../internal-tools/internal-tools.module';
import { TestingModule } from '../testing/testing.module';
import { ToolExecutionRepository } from './repositories/tool-execution.repository';
import { ToolsController } from './tools.controller';
import { ToolExecutorService } from './services/tool-executor.service';
import { ToolPermissionService } from './services/tool-permission.service';
import { ToolRegistryService } from './services/tool-registry.service';

@Module({
	imports: [
		AgentCoreModule,
		AuthModule,
		forwardRef(() => AgentsModule),
		BrowserModule,
		TestingModule,
		InternalToolsModule,
		ConnectorsModule,
	],
	controllers: [ToolsController],
	providers: [ToolRegistryService, ToolPermissionService, ToolExecutionRepository, ToolExecutorService],
	exports: [ToolRegistryService, ToolPermissionService, ToolExecutorService],
})
export class ToolsModule {}
