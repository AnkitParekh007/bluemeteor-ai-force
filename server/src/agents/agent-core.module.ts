import { Global, Module } from '@nestjs/common';

import { AgentConfigRegistryService } from './services/agent-config-registry.service';

@Global()
@Module({
	providers: [AgentConfigRegistryService],
	exports: [AgentConfigRegistryService],
})
export class AgentCoreModule {}
