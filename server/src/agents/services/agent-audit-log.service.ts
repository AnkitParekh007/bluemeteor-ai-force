import { Injectable } from '@nestjs/common';

import { newId } from '../../common/utils/ids';
import { AgentAuditRepository } from '../repositories/agent-audit.repository';

export interface AuditLogEntry {
	readonly id: string;
	readonly actorUserId?: string;
	readonly actorEmail?: string;
	readonly sessionId?: string | null;
	readonly runId?: string;
	readonly agentSlug?: string;
	readonly action: string;
	readonly details?: Record<string, unknown>;
	readonly createdAt: string;
}

@Injectable()
export class AgentAuditLogService {
	constructor(private readonly repo: AgentAuditRepository) {}

	async record(entry: Omit<AuditLogEntry, 'id' | 'createdAt'> & { id?: string; sessionId?: string | null }): Promise<AuditLogEntry> {
		return this.repo.create({
			id: entry.id ?? newId('audit'),
			actorUserId: entry.actorUserId,
			actorEmail: entry.actorEmail,
			sessionId: entry.sessionId ?? null,
			runId: entry.runId,
			agentSlug: entry.agentSlug,
			action: entry.action,
			details: entry.details,
			createdAt: new Date(),
		});
	}

	async listRecent(
		limit = 500,
		filters?: {
			readonly actionContains?: string;
			readonly agentSlug?: string;
			readonly runId?: string;
			readonly actorEmailContains?: string;
		},
	): Promise<AuditLogEntry[]> {
		return this.repo.listRecent(limit, filters);
	}

	async listBySession(sessionId: string): Promise<AuditLogEntry[]> {
		return this.repo.listBySessionId(sessionId);
	}

	async listByAgent(agentSlug: string): Promise<AuditLogEntry[]> {
		return this.repo.listByAgentSlug(agentSlug);
	}
}
