import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { parseJson, stringifyJson } from '../../common/utils/json';
import type { ToolExecutionRecord } from '../models/tool-execution.model';
import type { ToolExecutionStatus } from '../models/tool-execution.model';
import type { ToolRiskLevel } from '../models/tool-definition.model';

function mapRow(row: {
	id: string;
	runId: string;
	sessionId: string;
	agentSlug: string;
	toolId: string;
	status: string;
	riskLevel: string;
	inputJson: string | null;
	outputJson: string | null;
	error: string | null;
	approvalId: string | null;
	createdAt: Date;
	startedAt: Date | null;
	completedAt: Date | null;
}): ToolExecutionRecord {
	return {
		id: row.id,
		runId: row.runId,
		sessionId: row.sessionId,
		agentSlug: row.agentSlug,
		toolId: row.toolId,
		status: row.status as ToolExecutionStatus,
		riskLevel: row.riskLevel as ToolRiskLevel,
		input: parseJson<Record<string, unknown> | undefined>(row.inputJson, undefined),
		output: parseJson<Record<string, unknown> | undefined>(row.outputJson, undefined),
		error: row.error ?? undefined,
		approvalId: row.approvalId ?? undefined,
		createdAt: row.createdAt.toISOString(),
		startedAt: row.startedAt?.toISOString(),
		completedAt: row.completedAt?.toISOString(),
	};
}

@Injectable()
export class ToolExecutionRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: {
		id: string;
		runId: string;
		sessionId: string;
		agentSlug: string;
		toolId: string;
		status: string;
		riskLevel: string;
		input?: Record<string, unknown> | null;
		approvalId?: string | null;
		createdAt: Date;
	}): Promise<ToolExecutionRecord> {
		const row = await this.prisma.toolExecution.create({
			data: {
				id: data.id,
				runId: data.runId,
				sessionId: data.sessionId,
				agentSlug: data.agentSlug,
				toolId: data.toolId,
				status: data.status,
				riskLevel: data.riskLevel,
				inputJson: data.input ? stringifyJson(data.input) : null,
				approvalId: data.approvalId ?? null,
				createdAt: data.createdAt,
			},
		});
		return mapRow(row);
	}

	async findById(id: string): Promise<ToolExecutionRecord | null> {
		const row = await this.prisma.toolExecution.findUnique({ where: { id } });
		return row ? mapRow(row) : null;
	}

	async findByApprovalId(approvalId: string): Promise<ToolExecutionRecord | null> {
		const row = await this.prisma.toolExecution.findFirst({ where: { approvalId } });
		return row ? mapRow(row) : null;
	}

	async listByRunId(runId: string): Promise<ToolExecutionRecord[]> {
		const rows = await this.prisma.toolExecution.findMany({
			where: { runId },
			orderBy: { createdAt: 'asc' },
		});
		return rows.map(mapRow);
	}

	async listBySessionId(sessionId: string): Promise<ToolExecutionRecord[]> {
		const rows = await this.prisma.toolExecution.findMany({
			where: { sessionId },
			orderBy: { createdAt: 'desc' },
		});
		return rows.map(mapRow);
	}

	async update(
		id: string,
		patch: Partial<{
			status: string;
			output: Record<string, unknown> | null;
			error: string | null;
			approvalId: string | null;
			startedAt: Date | null;
			completedAt: Date | null;
		}>,
	): Promise<ToolExecutionRecord> {
		const row = await this.prisma.toolExecution.update({
			where: { id },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.output !== undefined
					? { outputJson: patch.output ? stringifyJson(patch.output) : null }
					: {}),
				...(patch.error !== undefined ? { error: patch.error } : {}),
				...(patch.approvalId !== undefined ? { approvalId: patch.approvalId } : {}),
				...(patch.startedAt !== undefined ? { startedAt: patch.startedAt } : {}),
				...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
			},
		});
		return mapRow(row);
	}
}
