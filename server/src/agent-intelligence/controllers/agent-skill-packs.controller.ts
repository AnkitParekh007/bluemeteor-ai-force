import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { RequireAnyPermissions } from '../../auth/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { AgentSkillPackRegistryService } from '../services/agent-skill-pack-registry.service';

@Controller('agent-intelligence/skill-packs')
export class AgentSkillPacksController {
	constructor(private readonly packs: AgentSkillPackRegistryService) {}

	@Get()
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	list(@Query('agentSlug') agentSlug?: string) {
		return this.packs.listSkillPacks(agentSlug);
	}

	@Get(':id')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	getOne(@Param('id') id: string) {
		return this.packs.getSkillPack(id);
	}

	@Post()
	@RequirePermissions('agents.manage')
	create(@Body() body: Record<string, unknown>) {
		return this.packs.createSkillPack({
			agentSlug: String(body['agentSlug'] ?? ''),
			key: String(body['key'] ?? ''),
			name: String(body['name'] ?? ''),
			description: body['description'] !== undefined ? String(body['description']) : undefined,
			status: body['status'] as never,
			toolIds: (body['toolIds'] as string[]) ?? [],
			promptTemplateIds: body['promptTemplateIds'] as string[] | undefined,
			workflowTemplateIds: body['workflowTemplateIds'] as string[] | undefined,
			knowledgeSources: body['knowledgeSources'] as string[] | undefined,
			metadata: body['metadata'] as Record<string, unknown> | undefined,
		});
	}

	@Patch(':id')
	@RequirePermissions('agents.manage')
	patch(@Param('id') id: string, @Body() body: Record<string, unknown>) {
		return this.packs.updateSkillPack(id, body as never);
	}

	@Post(':id/activate')
	@RequirePermissions('agents.manage')
	activate(@Param('id') id: string) {
		return this.packs.activateSkillPack(id);
	}

	@Post(':id/disable')
	@RequirePermissions('agents.manage')
	disable(@Param('id') id: string) {
		return this.packs.disableSkillPack(id);
	}
}
