import { Injectable } from '@nestjs/common';
import type { AgentSkillPack as PrismaPack } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { AgentSkillPack, AgentSkillPackStatus } from '../models/agent-skill-pack.model';

function parseJsonArray(json: string | null | undefined): string[] {
	if (!json?.trim()) return [];
	try {
		const v = JSON.parse(json) as unknown;
		return Array.isArray(v) ? v.map(String) : [];
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

export function mapSkillPackRow(row: PrismaPack): AgentSkillPack {
	return {
		id: row.id,
		agentSlug: row.agentSlug,
		key: row.key,
		name: row.name,
		description: row.description ?? undefined,
		status: row.status as AgentSkillPackStatus,
		toolIds: parseJsonArray(row.toolIdsJson),
		promptTemplateIds: parseJsonArray(row.promptTemplateIdsJson),
		workflowTemplateIds: parseJsonArray(row.workflowTemplateIdsJson),
		knowledgeSources: parseJsonArray(row.knowledgeSourcesJson),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		metadata: parseMeta(row.metadataJson),
	};
}

@Injectable()
export class AgentSkillPackRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findMany(agentSlug?: string): Promise<AgentSkillPack[]> {
		const rows = await this.prisma.agentSkillPack.findMany({
			where: agentSlug ? { agentSlug } : undefined,
			orderBy: [{ agentSlug: 'asc' }, { key: 'asc' }],
		});
		return rows.map(mapSkillPackRow);
	}

	async findById(id: string): Promise<AgentSkillPack | null> {
		const row = await this.prisma.agentSkillPack.findUnique({ where: { id } });
		return row ? mapSkillPackRow(row) : null;
	}

	async findByAgentAndKey(agentSlug: string, key: string): Promise<AgentSkillPack | null> {
		const row = await this.prisma.agentSkillPack.findUnique({
			where: { agentSlug_key: { agentSlug, key } },
		});
		return row ? mapSkillPackRow(row) : null;
	}

	async create(data: {
		id: string;
		agentSlug: string;
		key: string;
		name: string;
		description?: string;
		status: string;
		toolIdsJson: string;
		promptTemplateIdsJson?: string;
		workflowTemplateIdsJson?: string;
		knowledgeSourcesJson?: string;
		metadataJson?: string;
	}): Promise<AgentSkillPack> {
		const now = new Date();
		const row = await this.prisma.agentSkillPack.create({
			data: { ...data, createdAt: now, updatedAt: now },
		});
		return mapSkillPackRow(row);
	}

	async update(id: string, patch: Partial<Omit<PrismaPack, 'id' | 'createdAt'>>): Promise<AgentSkillPack> {
		const row = await this.prisma.agentSkillPack.update({
			where: { id },
			data: { ...patch, updatedAt: new Date() },
		});
		return mapSkillPackRow(row);
	}
}
