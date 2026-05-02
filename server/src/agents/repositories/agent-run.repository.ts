import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { isoNow } from '../../common/utils/dates';
import { stringifyJson } from '../../common/utils/json';
import type {
	AgentApprovalRequest,
	AgentRun,
	AgentRunStatus,
	AgentRunStep,
	AgentToolCall,
} from '../models/agent-run.model';
import type { AgentWorkspaceMode } from '../models/agent-session.model';
import { mapRun } from './mappers';

const runInclude = { steps: true, toolCalls: true, approvals: true } as const;

@Injectable()
export class AgentRunRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(params: {
		id: string;
		sessionId: string;
		agentSlug: string;
		mode: AgentWorkspaceMode;
		status: string;
		userMessage: string;
		createdAt: Date;
		updatedAt: Date;
		actorUserId?: string | null;
		actorEmail?: string | null;
	}): Promise<AgentRun> {
		const row = await this.prisma.agentRun.create({
			data: {
				id: params.id,
				sessionId: params.sessionId,
				agentSlug: params.agentSlug,
				mode: params.mode,
				status: params.status,
				userMessage: params.userMessage,
				actorUserId: params.actorUserId ?? null,
				actorEmail: params.actorEmail ?? null,
				createdAt: params.createdAt,
				updatedAt: params.updatedAt,
			},
			include: runInclude,
		});
		return mapRun(row);
	}

	async findById(runId: string): Promise<AgentRun | null> {
		const row = await this.prisma.agentRun.findUnique({
			where: { id: runId },
			include: runInclude,
		});
		return row ? mapRun(row) : null;
	}

	async requireById(runId: string): Promise<AgentRun> {
		const r = await this.findById(runId);
		if (!r) throw new Error(`Run ${runId} not found`);
		return r;
	}

	async listBySessionId(sessionId: string): Promise<AgentRun[]> {
		const rows = await this.prisma.agentRun.findMany({
			where: { sessionId },
			orderBy: { createdAt: 'desc' },
			include: runInclude,
		});
		return rows.map(mapRun);
	}

	async updateScalars(
		runId: string,
		patch: Partial<{
			status: string;
			finalAnswer: string | null | undefined;
			error: string | null | undefined;
			updatedAt: Date;
			completedAt: Date | null | undefined;
		}> &
			Required<Pick<{ updatedAt: Date }, 'updatedAt'>>,
	): Promise<AgentRun> {
		const row = await this.prisma.agentRun.update({
			where: { id: runId },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.finalAnswer !== undefined ? { finalAnswer: patch.finalAnswer } : {}),
				...(patch.error !== undefined ? { error: patch.error } : {}),
				updatedAt: patch.updatedAt,
				...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
			},
			include: runInclude,
		});
		return mapRun(row);
	}

	async addStep(runId: string, step: AgentRunStep): Promise<AgentRun> {
		await this.prisma.agentRunStep.create({
			data: {
				id: step.id,
				runId,
				title: step.title,
				description: step.description ?? null,
				status: step.status,
				startedAt: step.startedAt ? new Date(step.startedAt) : null,
				completedAt: step.completedAt ? new Date(step.completedAt) : null,
				error: step.error ?? null,
				metadataJson: stringifyJson(step.metadata),
			},
		});
		return this.requireById(runId);
	}

	async updateStep(stepId: string, patch: Partial<AgentRunStep>): Promise<AgentRun> {
		const step = await this.prisma.agentRunStep.findUnique({ where: { id: stepId } });
		if (!step) throw new Error(`Step ${stepId} not found`);
		await this.prisma.agentRunStep.update({
			where: { id: stepId },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.completedAt !== undefined
					? { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }
					: {}),
				...(patch.startedAt !== undefined
					? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
					: {}),
				...(patch.error !== undefined ? { error: patch.error ?? null } : {}),
				...(patch.metadata !== undefined ? { metadataJson: stringifyJson(patch.metadata) } : {}),
			},
		});
		return this.requireById(step.runId);
	}

	async addToolCall(runId: string, tc: AgentToolCall): Promise<AgentRun> {
		await this.prisma.agentToolCall.create({
			data: {
				id: tc.id,
				runId,
				name: tc.name,
				description: tc.description ?? null,
				status: tc.status,
				inputJson: stringifyJson(tc.input),
				outputJson: stringifyJson(tc.output),
				error: tc.error ?? null,
				startedAt: tc.startedAt ? new Date(tc.startedAt) : null,
				completedAt: tc.completedAt ? new Date(tc.completedAt) : null,
			},
		});
		return this.requireById(runId);
	}

	async updateToolCall(toolCallId: string, patch: Partial<AgentToolCall>): Promise<AgentRun> {
		const row = await this.prisma.agentToolCall.findUnique({ where: { id: toolCallId } });
		if (!row) throw new Error(`Tool call ${toolCallId} not found`);
		await this.prisma.agentToolCall.update({
			where: { id: toolCallId },
			data: {
				...(patch.status !== undefined ? { status: patch.status } : {}),
				...(patch.output !== undefined ? { outputJson: stringifyJson(patch.output) } : {}),
				...(patch.error !== undefined ? { error: patch.error ?? null } : {}),
				...(patch.completedAt !== undefined
					? { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }
					: {}),
			},
		});
		await this.prisma.agentRun.update({
			where: { id: row.runId },
			data: { updatedAt: new Date(isoNow()) },
		});
		return this.requireById(row.runId);
	}

	async addApproval(runId: string, a: AgentApprovalRequest): Promise<AgentRun> {
		await this.prisma.agentApproval.create({
			data: {
				id: a.id,
				runId,
				title: a.title,
				description: a.description,
				riskLevel: a.riskLevel,
				actionType: a.actionType,
				payloadJson: stringifyJson(a.payload) ?? '{}',
				status: a.status,
				createdAt: new Date(a.createdAt),
				resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : null,
				requestedByUserId: a.requestedByUserId ?? null,
			},
		});
		return this.requireById(runId);
	}

	async resolveApproval(
		runId: string,
		approvalId: string,
		status: 'approved' | 'rejected',
		resolvedAt: Date,
		resolver?: { userId: string; email: string },
	): Promise<AgentRun> {
		await this.prisma.agentApproval.update({
			where: { id: approvalId },
			data: {
				status,
				resolvedAt,
				...(resolver
					? { resolvedByUserId: resolver.userId, resolvedByEmail: resolver.email }
					: {}),
			},
		});
		const run = await this.requireById(runId);
		const approvals = run.approvals.map((x) =>
			x.id === approvalId ? { ...x, status, resolvedAt: resolvedAt.toISOString() } : x,
		);
		let nextStatus: AgentRunStatus = run.status;
		if (run.status === 'waiting_for_approval' && approvals.every((ap) => ap.status !== 'pending')) {
			nextStatus = 'completed';
		}
		return this.updateScalars(runId, {
			status: nextStatus,
			updatedAt: resolvedAt,
		});
	}

	async count(): Promise<number> {
		return this.prisma.agentRun.count();
	}
}
