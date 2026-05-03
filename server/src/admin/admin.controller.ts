import { Controller, Get, Query } from '@nestjs/common';

import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { AdminSummaryService } from './admin-summary.service';

@Controller('admin')
export class AdminController {
	constructor(private readonly admin: AdminSummaryService) {}

	@Get('summary')
	@RequireAnyPermissions('system.debug.view', 'system.admin')
	async summary(): Promise<Record<string, unknown>> {
		return this.admin.getSummary();
	}

	@Get('platform/summary')
	@RequireAnyPermissions('system.debug.view', 'system.admin')
	async platformSummary(): Promise<Record<string, unknown>> {
		return this.admin.getSummary();
	}

	@Get('agents/summary')
	@RequireAnyPermissions('agents.manage', 'agents.readiness.view', 'system.admin')
	agentsSummary(): Record<string, unknown> {
		return this.admin.getAgentsSummary();
	}

	@Get('approvals')
	@RequireAnyPermissions('tools.approve', 'system.admin')
	async approvals(
		@Query('status') status?: string,
		@Query('limit') limit?: string,
	): Promise<unknown[]> {
		const n = Number(limit ?? '80') || 80;
		return this.admin.listApprovals({ status: status?.trim() || undefined, limit: n });
	}
}
