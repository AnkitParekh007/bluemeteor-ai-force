import { Module, forwardRef } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { AgentPromptsController } from './controllers/agent-prompts.controller';
import { AgentSkillPacksController } from './controllers/agent-skill-packs.controller';
import { AgentWorkflowsController } from './controllers/agent-workflows.controller';
import { AgentEvaluationsController } from './controllers/agent-evaluations.controller';
import { AgentPromptTemplateRepository } from './repositories/agent-prompt-template.repository';
import { AgentSkillPackRepository } from './repositories/agent-skill-pack.repository';
import { AgentWorkflowTemplateRepository } from './repositories/agent-workflow-template.repository';
import { AgentEvaluationRepository } from './repositories/agent-evaluation.repository';
import { AgentPromptRegistryService } from './services/agent-prompt-registry.service';
import { AgentSkillPackRegistryService } from './services/agent-skill-pack-registry.service';
import { AgentWorkflowTemplateService } from './services/agent-workflow-template.service';
import { AgentQualityScorerService } from './services/agent-quality-scorer.service';
import { AgentEvaluationService } from './services/agent-evaluation.service';
import { AgentIntelligenceSeedService } from './services/agent-intelligence-seed.service';

@Module({
	imports: [AuthModule, forwardRef(() => AgentsModule)],
	controllers: [
		AgentPromptsController,
		AgentSkillPacksController,
		AgentWorkflowsController,
		AgentEvaluationsController,
	],
	providers: [
		AgentPromptTemplateRepository,
		AgentSkillPackRepository,
		AgentWorkflowTemplateRepository,
		AgentEvaluationRepository,
		AgentPromptRegistryService,
		AgentSkillPackRegistryService,
		AgentWorkflowTemplateService,
		AgentQualityScorerService,
		AgentEvaluationService,
		AgentIntelligenceSeedService,
	],
	exports: [
		AgentPromptRegistryService,
		AgentSkillPackRegistryService,
		AgentWorkflowTemplateService,
		AgentEvaluationService,
		AgentEvaluationRepository,
	],
})
export class AgentIntelligenceModule {}
