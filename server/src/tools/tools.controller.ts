import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireRunAccess } from '../auth/decorators/require-session-access.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { SessionAccessGuard } from '../auth/guards/session-access.guard';
import type { AuthUser } from '../auth/models/auth-user.model';
import { ExecuteToolDto } from './dto/execute-tool.dto';
import { ToolExecutionRepository } from './repositories/tool-execution.repository';
import { ToolExecutorService } from './services/tool-executor.service';
import { ToolRegistryService } from './services/tool-registry.service';

@Controller('tools')
export class ToolsController {
	constructor(
		private readonly registry: ToolRegistryService,
		private readonly executions: ToolExecutionRepository,
		private readonly executor: ToolExecutorService,
	) {}

	@Get()
	@RequirePermissions('tools.view')
	listTools() {
		return this.registry.listTools();
	}

	@Get('runs/:runId/executions')
	@UseGuards(SessionAccessGuard)
	@RequireRunAccess('view')
	@RequirePermissions('tools.view')
	listByRun(@Param('runId') runId: string) {
		return this.executions.listByRunId(runId);
	}

	@Get(':toolId')
	@RequirePermissions('tools.view')
	getTool(@Param('toolId') toolId: string) {
		const t = this.registry.getTool(toolId);
		if (!t) throw new NotFoundException(`Unknown tool ${toolId}`);
		return t;
	}

	@Post('execute')
	@Throttle({ agent: { limit: 20, ttl: 60_000 } })
	@UseGuards(SessionAccessGuard)
	@RequireRunAccess('use', 'runId', 'body')
	@RequirePermissions('tools.execute.low')
	async execute(@CurrentUser() user: AuthUser, @Body() dto: ExecuteToolDto) {
		return this.executor.execute({
			runId: dto.runId,
			sessionId: dto.sessionId,
			agentSlug: dto.agentSlug,
			mode: dto.mode,
			toolId: dto.toolId,
			input: dto.input ?? {},
			actorUserId: user.id,
		});
	}
}
