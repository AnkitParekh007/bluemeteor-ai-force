import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { RequireAnyPermissions } from '../../auth/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { AgentPromptTemplateType } from '../models/agent-prompt-template.model';
import { AgentPromptRegistryService } from '../services/agent-prompt-registry.service';

@Controller('agent-intelligence/prompts')
export class AgentPromptsController {
	constructor(private readonly prompts: AgentPromptRegistryService) {}

	@Get()
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	list(@Query('agentSlug') agentSlug?: string) {
		return this.prompts.listTemplates(agentSlug);
	}

	@Get(':id')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	getOne(@Param('id') id: string) {
		return this.prompts.getTemplate(id);
	}

	@Post()
	@RequirePermissions('agents.manage')
	create(@Body() body: Record<string, unknown>) {
		return this.prompts.createTemplate({
			agentSlug: String(body['agentSlug'] ?? ''),
			name: String(body['name'] ?? ''),
			description: body['description'] !== undefined ? String(body['description']) : undefined,
			version: String(body['version'] ?? '1.0.0'),
			status: body['status'] as never,
			type: body['type'] as AgentPromptTemplateType,
			content: String(body['content'] ?? ''),
			variables: body['variables'] as never,
			createdByUserId: body['createdByUserId'] !== undefined ? String(body['createdByUserId']) : undefined,
			metadata: body['metadata'] as Record<string, unknown> | undefined,
		});
	}

	@Patch(':id')
	@RequirePermissions('agents.manage')
	patch(@Param('id') id: string, @Body() body: Record<string, unknown>) {
		return this.prompts.updateTemplate(id, body as never);
	}

	@Post(':id/activate')
	@RequirePermissions('agents.manage')
	activate(@Param('id') id: string) {
		return this.prompts.activateTemplate(id);
	}

	@Post(':id/archive')
	@RequirePermissions('agents.manage')
	archive(@Param('id') id: string) {
		return this.prompts.archiveTemplate(id);
	}

	@Post('render')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	render(
		@Body()
		body: {
			agentSlug: string;
			templateType: AgentPromptTemplateType;
			variables: Record<string, unknown>;
		},
	) {
		return this.prompts.renderTemplate(body);
	}
}
