import { Injectable } from '@nestjs/common';
import type { AgentPromptTemplate as PrismaPrompt } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type {
	AgentPromptTemplate,
	AgentPromptTemplateStatus,
	AgentPromptTemplateType,
	AgentPromptVariable,
} from '../models/agent-prompt-template.model';

function parseVariables(json: string | null | undefined): AgentPromptVariable[] {
	if (!json?.trim()) return [];
	try {
		const v = JSON.parse(json) as unknown;
		return Array.isArray(v) ? (v as AgentPromptVariable[]) : [];
	} catch {
		return [];
	}
}

function parseMeta(json: string | null | undefined): Record<string, unknown> | undefined {
	if (!json?.trim()) return undefined;
	try {
		return JSON.parse(json) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

export function mapPromptRow(row: PrismaPrompt): AgentPromptTemplate {
	return {
		id: row.id,
		agentSlug: row.agentSlug,
		name: row.name,
		description: row.description ?? undefined,
		version: row.version,
		status: row.status as AgentPromptTemplateStatus,
		type: row.type as AgentPromptTemplateType,
		content: row.content,
		variables: parseVariables(row.variablesJson),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		createdByUserId: row.createdByUserId ?? undefined,
		metadata: parseMeta(row.metadataJson),
	};
}

@Injectable()
export class AgentPromptTemplateRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findMany(agentSlug?: string): Promise<AgentPromptTemplate[]> {
		const rows = await this.prisma.agentPromptTemplate.findMany({
			where: agentSlug ? { agentSlug } : undefined,
			orderBy: [{ agentSlug: 'asc' }, { type: 'asc' }, { updatedAt: 'desc' }],
		});
		return rows.map(mapPromptRow);
	}

	async findById(id: string): Promise<AgentPromptTemplate | null> {
		const row = await this.prisma.agentPromptTemplate.findUnique({ where: { id } });
		return row ? mapPromptRow(row) : null;
	}

	async findActiveByAgentAndType(agentSlug: string, type: string): Promise<AgentPromptTemplate | null> {
		const row = await this.prisma.agentPromptTemplate.findFirst({
			where: { agentSlug, type, status: 'active' },
			orderBy: { updatedAt: 'desc' },
		});
		return row ? mapPromptRow(row) : null;
	}

	async create(data: {
		id: string;
		agentSlug: string;
		name: string;
		description?: string;
		version: string;
		status: string;
		type: string;
		content: string;
		variablesJson?: string;
		createdByUserId?: string;
		metadataJson?: string;
	}): Promise<AgentPromptTemplate> {
		const now = new Date();
		const row = await this.prisma.agentPromptTemplate.create({
			data: {
				...data,
				createdAt: now,
				updatedAt: now,
			},
		});
		return mapPromptRow(row);
	}

	async update(id: string, patch: Partial<Omit<PrismaPrompt, 'id' | 'createdAt'>>): Promise<AgentPromptTemplate> {
		const row = await this.prisma.agentPromptTemplate.update({
			where: { id },
			data: { ...patch, updatedAt: new Date() },
		});
		return mapPromptRow(row);
	}

	async archiveOthersSameType(agentSlug: string, type: string, exceptId: string): Promise<void> {
		await this.prisma.agentPromptTemplate.updateMany({
			where: { agentSlug, type, id: { not: exceptId }, status: 'active' },
			data: { status: 'archived', updatedAt: new Date() },
		});
	}
}
