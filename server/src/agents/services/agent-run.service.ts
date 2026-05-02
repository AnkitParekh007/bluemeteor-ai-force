import { Injectable, NotFoundException } from '@nestjs/common';

import { isoNow } from '../../common/utils/dates';
import { newId } from '../../common/utils/ids';
import type {
	AgentApprovalRequest,
	AgentRun,
	AgentRunStep,
	AgentToolCall,
} from '../models/agent-run.model';
import type { AgentWorkspaceMode } from '../models/agent-session.model';
import { AgentRunRepository } from '../repositories/agent-run.repository';

@Injectable()
export class AgentRunService {
	constructor(private readonly runs: AgentRunRepository) {}

	async createRun(
		sessionId: string,
		agentSlug: string,
		mode: AgentWorkspaceMode,
		userMessage: string,
		actor?: { actorUserId?: string; actorEmail?: string },
	): Promise<AgentRun> {
		const t = new Date();
		return this.runs.create({
			id: newId('run'),
			sessionId,
			agentSlug,
			mode,
			status: 'queued',
			userMessage,
			createdAt: t,
			updatedAt: t,
			actorUserId: actor?.actorUserId ?? null,
			actorEmail: actor?.actorEmail ?? null,
		});
	}

	async getRun(runId: string): Promise<AgentRun> {
		const r = await this.runs.findById(runId);
		if (!r) throw new NotFoundException(`Run ${runId} not found`);
		return r;
	}

	async listRunsForSession(sessionId: string): Promise<AgentRun[]> {
		return this.runs.listBySessionId(sessionId);
	}

	async updateRun(runId: string, patch: Partial<AgentRun>): Promise<AgentRun> {
		return this.runs.updateScalars(runId, {
			...(patch.status !== undefined ? { status: patch.status } : {}),
			...(patch.finalAnswer !== undefined ? { finalAnswer: patch.finalAnswer } : {}),
			...(patch.error !== undefined ? { error: patch.error } : {}),
			updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : new Date(),
			...(patch.completedAt !== undefined
				? { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }
				: {}),
		});
	}

	async addStep(runId: string, step: AgentRunStep): Promise<AgentRun> {
		return this.runs.addStep(runId, step);
	}

	async updateStep(runId: string, stepId: string, patch: Partial<AgentRunStep>): Promise<AgentRun> {
		void runId;
		return this.runs.updateStep(stepId, patch);
	}

	async addToolCall(runId: string, tc: AgentToolCall): Promise<AgentRun> {
		return this.runs.addToolCall(runId, tc);
	}

	async updateToolCall(runId: string, toolCallId: string, patch: Partial<AgentToolCall>): Promise<AgentRun> {
		void runId;
		return this.runs.updateToolCall(toolCallId, patch);
	}

	async addApproval(runId: string, a: AgentApprovalRequest): Promise<AgentRun> {
		return this.runs.addApproval(runId, a);
	}

	async resolveApproval(
		runId: string,
		approvalId: string,
		status: 'approved' | 'rejected',
		resolver?: { userId: string; email: string },
	): Promise<AgentRun> {
		return this.runs.resolveApproval(runId, approvalId, status, new Date(isoNow()), resolver);
	}
}
