import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { RequireAnyPermissions } from '../../auth/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { AgentWorkflowTemplateService } from '../services/agent-workflow-template.service';

@Controller('agent-intelligence/workflows')
export class AgentWorkflowsController {
	constructor(private readonly workflows: AgentWorkflowTemplateService) {}

	@Get()
	@RequirePermissions('agents.readiness.view')
	list(@Query('agentSlug') agentSlug?: string) {
		return this.workflows.listWorkflows(agentSlug);
	}

	@Get(':id')
	@RequirePermissions('agents.readiness.view')
	getOne(@Param('id') id: string) {
		return this.workflows.getWorkflow(id);
	}

	@Post()
	@RequirePermissions('agents.manage')
	create(@Body() body: Record<string, unknown>) {
		return this.workflows.createWorkflow({
			agentSlug: String(body['agentSlug'] ?? ''),
			key: String(body['key'] ?? ''),
			name: String(body['name'] ?? ''),
			description: body['description'] !== undefined ? String(body['description']) : undefined,
			category: String(body['category'] ?? 'general'),
			mode: body['mode'] as 'ask' | 'plan' | 'act',
			steps: (body['steps'] as never) ?? [],
			requiredTools: body['requiredTools'] as string[] | undefined,
			outputArtifactTypes: body['outputArtifactTypes'] as string[] | undefined,
			status: body['status'] as never,
			metadata: body['metadata'] as Record<string, unknown> | undefined,
		});
	}

	@Patch(':id')
	@RequirePermissions('agents.manage')
	patch(@Param('id') id: string, @Body() body: Record<string, unknown>) {
		return this.workflows.updateWorkflow(id, body as never);
	}

	@Post(':id/activate')
	@RequirePermissions('agents.manage')
	activate(@Param('id') id: string) {
		return this.workflows.activateWorkflow(id);
	}

	@Post(':id/disable')
	@RequirePermissions('agents.manage')
	disable(@Param('id') id: string) {
		return this.workflows.disableWorkflow(id);
	}

	@Post('match')
	@RequireAnyPermissions('agents.readiness.view', 'agents.manage')
	match(
		@Body() body: { agentSlug: string; message: string; mode: 'ask' | 'plan' | 'act' },
	) {
		return this.workflows.matchWorkflowForPrompt(body.agentSlug, body.message, body.mode);
	}
}
