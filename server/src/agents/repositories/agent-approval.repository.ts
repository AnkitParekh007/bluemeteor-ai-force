import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { parseJson, stringifyJson } from '../../common/utils/json';
import type { AgentApprovalRequest } from '../models/agent-run.model';

@Injectable()
export class AgentApprovalRepository {
	constructor(private readonly prisma: PrismaService) {}

	async listByRunId(runId: string): Promise<AgentApprovalRequest[]> {
		const rows = await this.prisma.agentApproval.findMany({ where: { runId } });
		return rows.map((a) => ({
			id: a.id,
			runId: a.runId,
			title: a.title,
			description: a.description,
			riskLevel: a.riskLevel as AgentApprovalRequest['riskLevel'],
			actionType: a.actionType,
			payload: parseJson<Record<string, unknown>>(a.payloadJson, {}),
			status: a.status as AgentApprovalRequest['status'],
			createdAt: a.createdAt.toISOString(),
			resolvedAt: a.resolvedAt?.toISOString(),
		}));
	}
}
