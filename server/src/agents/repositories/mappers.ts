import type {
	AgentApproval as PApproval,
	AgentArtifact as PArt,
	AgentMessage as PMsg,
	AgentRun as PRun,
	AgentRunStep as PStep,
	AgentRuntimeEvent as PEvent,
	AgentToolCall as PTool,
} from '@prisma/client';

import { parseJson } from '../../common/utils/json';
import type { AgentArtifact } from '../models/agent-artifact.model';
import type { AgentRuntimeEvent } from '../models/agent-runtime-event.model';
import type { AgentMessage } from '../models/agent-message.model';
import type {
	AgentApprovalRequest,
	AgentRun,
	AgentRunStep,
	AgentToolCall,
} from '../models/agent-run.model';
import type { AgentSession, AgentSessionStatus, AgentWorkspaceMode } from '../models/agent-session.model';

export function mapSession(
	s: { id: string; agentSlug: string; title: string; mode: string; status: string; createdAt: Date; updatedAt: Date; messageCount: number; preview: string | null },
): AgentSession {
	return {
		id: s.id,
		agentSlug: s.agentSlug,
		title: s.title,
		mode: s.mode as AgentWorkspaceMode,
		status: s.status as AgentSessionStatus,
		createdAt: s.createdAt.toISOString(),
		updatedAt: s.updatedAt.toISOString(),
		messageCount: s.messageCount,
		preview: s.preview ?? undefined,
	};
}

export function mapMessage(m: PMsg): AgentMessage {
	return {
		id: m.id,
		sessionId: m.sessionId,
		role: m.role as AgentMessage['role'],
		content: m.content,
		createdAt: m.createdAt.toISOString(),
		status: m.status as AgentMessage['status'],
		metadata: parseJson<Record<string, unknown> | undefined>(m.metadataJson, undefined),
	};
}

export function mapRun(
	run: PRun & {
		steps: PStep[];
		toolCalls: PTool[];
		approvals: PApproval[];
	},
): AgentRun {
	return {
		id: run.id,
		sessionId: run.sessionId,
		agentSlug: run.agentSlug,
		mode: run.mode as AgentRun['mode'],
		status: run.status as AgentRun['status'],
		userMessage: run.userMessage,
		finalAnswer: run.finalAnswer ?? undefined,
		steps: run.steps.map(mapStep),
		toolCalls: run.toolCalls.map(mapToolCall),
		approvals: run.approvals.map(mapApproval),
		createdAt: run.createdAt.toISOString(),
		updatedAt: run.updatedAt.toISOString(),
		completedAt: run.completedAt?.toISOString(),
		error: run.error ?? undefined,
		actorUserId: run.actorUserId ?? undefined,
		actorEmail: run.actorEmail ?? undefined,
	};
}

function mapStep(s: PStep): AgentRunStep {
	return {
		id: s.id,
		runId: s.runId,
		title: s.title,
		description: s.description ?? undefined,
		status: s.status as AgentRunStep['status'],
		startedAt: s.startedAt?.toISOString(),
		completedAt: s.completedAt?.toISOString(),
		error: s.error ?? undefined,
		metadata: parseJson<Record<string, unknown> | undefined>(s.metadataJson, undefined),
	};
}

function mapToolCall(t: PTool): AgentToolCall {
	return {
		id: t.id,
		runId: t.runId,
		name: t.name,
		description: t.description ?? undefined,
		status: t.status as AgentToolCall['status'],
		input: parseJson<Record<string, unknown> | undefined>(t.inputJson, undefined),
		output: parseJson<Record<string, unknown> | undefined>(t.outputJson, undefined),
		error: t.error ?? undefined,
		startedAt: t.startedAt?.toISOString(),
		completedAt: t.completedAt?.toISOString(),
	};
}

function mapApproval(a: PApproval): AgentApprovalRequest {
	return {
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
		requestedByUserId: a.requestedByUserId ?? undefined,
		resolvedByUserId: a.resolvedByUserId ?? undefined,
		resolvedByEmail: a.resolvedByEmail ?? undefined,
	};
}

export function mapArtifact(a: PArt): AgentArtifact {
	return {
		id: a.id,
		sessionId: a.sessionId,
		runId: a.runId ?? undefined,
		agentSlug: a.agentSlug,
		type: a.type as AgentArtifact['type'],
		title: a.title,
		description: a.description ?? undefined,
		content: a.content,
		language: a.language ?? undefined,
		createdAt: a.createdAt.toISOString(),
		updatedAt: a.updatedAt?.toISOString(),
		metadata: parseJson<Record<string, unknown> | undefined>(a.metadataJson, undefined),
	};
}

export function mapRuntimeEvent(e: PEvent): AgentRuntimeEvent {
	return {
		id: e.id,
		runId: e.runId ?? undefined,
		sessionId: e.sessionId,
		agentSlug: e.agentSlug,
		type: e.type as AgentRuntimeEvent['type'],
		title: e.title,
		message: e.message ?? undefined,
		timestamp: e.timestamp.toISOString(),
		payload: parseJson<Record<string, unknown> | undefined>(e.payloadJson, undefined),
	};
}
