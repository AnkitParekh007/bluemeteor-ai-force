import { Injectable } from '@nestjs/common';
import type { AgentWorkflowTemplate as PrismaWf } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { AgentWorkflowStep, AgentWorkflowTemplate } from '../models/agent-workflow-template.model';

function parseSteps(json: string): AgentWorkflowStep[] {
	try {
		const v = JSON.parse(json) as unknown;
		return Array.isArray(v) ? (v as AgentWorkflowStep[]) : [];
	} catch {
		return [];
	}
}

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

export function mapWorkflowRow(row: PrismaWf): AgentWorkflowTemplate {
	return {
		id: row.id,
		agentSlug: row.agentSlug,
		key: row.key,
		name: row.name,
		description: row.description ?? undefined,
		category: row.category,
		mode: row.mode as AgentWorkflowTemplate['mode'],
		steps: parseSteps(row.stepsJson).slice(0, 50),
		requiredTools: parseJsonArray(row.requiredToolsJson),
		outputArtifactTypes: parseJsonArray(row.outputArtifactTypesJson),
		status: row.status as AgentWorkflowTemplate['status'],
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		metadata: parseMeta(row.metadataJson),
	};
}

@Injectable()
export class AgentWorkflowTemplateRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findMany(agentSlug?: string): Promise<AgentWorkflowTemplate[]> {
		const rows = await this.prisma.agentWorkflowTemplate.findMany({
			where: agentSlug ? { agentSlug } : undefined,
			orderBy: [{ agentSlug: 'asc' }, { key: 'asc' }],
		});
		return rows.map(mapWorkflowRow);
	}

	async findById(id: string): Promise<AgentWorkflowTemplate | null> {
		const row = await this.prisma.agentWorkflowTemplate.findUnique({ where: { id } });
		return row ? mapWorkflowRow(row) : null;
	}

	async findByAgentAndKey(agentSlug: string, key: string): Promise<AgentWorkflowTemplate | null> {
		const row = await this.prisma.agentWorkflowTemplate.findUnique({
			where: { agentSlug_key: { agentSlug, key } },
		});
		return row ? mapWorkflowRow(row) : null;
	}

	async create(data: {
		id: string;
		agentSlug: string;
		key: string;
		name: string;
		description?: string;
		category: string;
		mode: string;
		stepsJson: string;
		requiredToolsJson?: string;
		outputArtifactTypesJson?: string;
		status: string;
		metadataJson?: string;
	}): Promise<AgentWorkflowTemplate> {
		const now = new Date();
		const row = await this.prisma.agentWorkflowTemplate.create({
			data: { ...data, createdAt: now, updatedAt: now },
		});
		return mapWorkflowRow(row);
	}

	async update(id: string, patch: Partial<Omit<PrismaWf, 'id' | 'createdAt'>>): Promise<AgentWorkflowTemplate> {
		const row = await this.prisma.agentWorkflowTemplate.update({
			where: { id },
			data: { ...patch, updatedAt: new Date() },
		});
		return mapWorkflowRow(row);
	}
}
