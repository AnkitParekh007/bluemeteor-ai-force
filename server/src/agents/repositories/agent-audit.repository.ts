import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { parseJson, stringifyJson } from '../../common/utils/json';
import type { AuditLogEntry } from '../services/agent-audit-log.service';

@Injectable()
export class AgentAuditRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(
		entry: Omit<AuditLogEntry, 'id' | 'createdAt'> & {
			id?: string;
			createdAt?: Date;
			sessionId?: string | null;
		},
	): Promise<AuditLogEntry> {
		const id = entry.id ?? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const createdAt = entry.createdAt ?? new Date();
		const row = await this.prisma.agentAuditLog.create({
			data: {
				id,
				actorUserId: entry.actorUserId ?? null,
				actorEmail: entry.actorEmail ?? null,
				sessionId: entry.sessionId !== undefined ? entry.sessionId : null,
				runId: entry.runId ?? null,
				agentSlug: entry.agentSlug ?? null,
				action: entry.action,
				detailsJson: stringifyJson(entry.details),
				createdAt,
			},
		});
		return {
			id: row.id,
			actorUserId: row.actorUserId ?? undefined,
			actorEmail: row.actorEmail ?? undefined,
			sessionId: row.sessionId ?? undefined,
			runId: row.runId ?? undefined,
			agentSlug: row.agentSlug ?? undefined,
			action: row.action,
			details: parseJson<Record<string, unknown> | undefined>(row.detailsJson, undefined),
			createdAt: row.createdAt.toISOString(),
		};
	}

	async listBySessionId(sessionId: string): Promise<AuditLogEntry[]> {
		const rows = await this.prisma.agentAuditLog.findMany({
			where: { sessionId },
			orderBy: { createdAt: 'desc' },
		});
		return rows.map((r) => ({
			id: r.id,
			actorUserId: r.actorUserId ?? undefined,
			actorEmail: r.actorEmail ?? undefined,
			sessionId: r.sessionId ?? undefined,
			runId: r.runId ?? undefined,
			agentSlug: r.agentSlug ?? undefined,
			action: r.action,
			details: parseJson<Record<string, unknown> | undefined>(r.detailsJson, undefined),
			createdAt: r.createdAt.toISOString(),
		}));
	}

	async listRecent(take: number): Promise<AuditLogEntry[]> {
		const rows = await this.prisma.agentAuditLog.findMany({
			orderBy: { createdAt: 'desc' },
			take,
		});
		return rows.map((r) => ({
			id: r.id,
			actorUserId: r.actorUserId ?? undefined,
			actorEmail: r.actorEmail ?? undefined,
			sessionId: r.sessionId ?? undefined,
			runId: r.runId ?? undefined,
			agentSlug: r.agentSlug ?? undefined,
			action: r.action,
			details: parseJson<Record<string, unknown> | undefined>(r.detailsJson, undefined),
			createdAt: r.createdAt.toISOString(),
		}));
	}

	async listByAgentSlug(agentSlug: string): Promise<AuditLogEntry[]> {
		const rows = await this.prisma.agentAuditLog.findMany({
			where: { agentSlug },
			orderBy: { createdAt: 'desc' },
		});
		return rows.map((r) => ({
			id: r.id,
			actorUserId: r.actorUserId ?? undefined,
			actorEmail: r.actorEmail ?? undefined,
			sessionId: r.sessionId ?? undefined,
			runId: r.runId ?? undefined,
			agentSlug: r.agentSlug ?? undefined,
			action: r.action,
			details: parseJson<Record<string, unknown> | undefined>(r.detailsJson, undefined),
			createdAt: r.createdAt.toISOString(),
		}));
	}
}
