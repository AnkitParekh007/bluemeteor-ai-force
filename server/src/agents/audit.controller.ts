import { Controller, Get, Query } from '@nestjs/common';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AgentAuditLogService } from './services/agent-audit-log.service';

@Controller('audit')
export class AuditController {
	constructor(private readonly audit: AgentAuditLogService) {}

	@Get('logs')
	@RequirePermissions('audit.view')
	listLogs(@Query('limit') limit?: string) {
		const n = Math.min(500, Math.max(1, Number(limit ?? '200') || 200));
		return this.audit.listRecent(n);
	}
}
