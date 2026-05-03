import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type {
	AgentEvaluationCase,
	AgentEvaluationCaseResult,
	AgentEvaluationRun,
} from '../models/agent-evaluation.model';

function parseStringArray(json: string | null | undefined): string[] {
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

function mapCaseRow(row: {
	id: string;
	agentSlug: string;
	key: string;
	name: string;
	description: string | null;
	inputPrompt: string;
	expectedBehaviorsJson: string;
	expectedArtifactsJson: string | null;
	expectedToolsJson: string | null;
	category: string;
	priority: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	metadataJson: string | null;
}): AgentEvaluationCase {
	return {
		id: row.id,
		agentSlug: row.agentSlug,
		key: row.key,
		name: row.name,
		description: row.description ?? undefined,
		inputPrompt: row.inputPrompt,
		expectedBehaviors: parseStringArray(row.expectedBehaviorsJson),
		expectedArtifacts: parseStringArray(row.expectedArtifactsJson),
		expectedTools: parseStringArray(row.expectedToolsJson),
		category: row.category,
		priority: row.priority as AgentEvaluationCase['priority'],
		status: row.status as AgentEvaluationCase['status'],
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		metadata: parseMeta(row.metadataJson),
	};
}

function mapResultRow(row: {
	id: string;
	evaluationRunId: string;
	evaluationCaseId: string;
	status: string;
	score: number;
	inputPrompt: string;
	actualAnswer: string | null;
	expectedSummary: string | null;
	toolResultsJson: string | null;
	artifactResultsJson: string | null;
	issuesJson: string | null;
	createdAt: Date;
}): AgentEvaluationCaseResult {
	let toolResults: unknown[] | undefined;
	let artifactResults: unknown[] | undefined;
	let issues: string[] = [];
	try {
		if (row.toolResultsJson?.trim()) toolResults = JSON.parse(row.toolResultsJson) as unknown[];
	} catch {
		toolResults = undefined;
	}
	try {
		if (row.artifactResultsJson?.trim()) artifactResults = JSON.parse(row.artifactResultsJson) as unknown[];
	} catch {
		artifactResults = undefined;
	}
	try {
		if (row.issuesJson?.trim()) issues = JSON.parse(row.issuesJson) as string[];
	} catch {
		issues = [];
	}
	return {
		id: row.id,
		evaluationRunId: row.evaluationRunId,
		evaluationCaseId: row.evaluationCaseId,
		status: row.status as AgentEvaluationCaseResult['status'],
		score: row.score,
		inputPrompt: row.inputPrompt,
		actualAnswer: row.actualAnswer ?? undefined,
		expectedSummary: row.expectedSummary ?? undefined,
		toolResults,
		artifactResults,
		issues,
		createdAt: row.createdAt.toISOString(),
	};
}

@Injectable()
export class AgentEvaluationRepository {
	constructor(private readonly prisma: PrismaService) {}

	async listCases(agentSlug?: string): Promise<AgentEvaluationCase[]> {
		const rows = await this.prisma.agentEvaluationCase.findMany({
			where: agentSlug ? { agentSlug } : undefined,
			orderBy: [{ agentSlug: 'asc' }, { priority: 'desc' }, { key: 'asc' }],
		});
		return rows.map(mapCaseRow);
	}

	async findCaseById(id: string): Promise<AgentEvaluationCase | null> {
		const row = await this.prisma.agentEvaluationCase.findUnique({ where: { id } });
		return row ? mapCaseRow(row) : null;
	}

	async createCase(data: {
		id: string;
		agentSlug: string;
		key: string;
		name: string;
		description?: string;
		inputPrompt: string;
		expectedBehaviorsJson: string;
		expectedArtifactsJson?: string;
		expectedToolsJson?: string;
		category: string;
		priority: string;
		status: string;
		metadataJson?: string;
	}): Promise<AgentEvaluationCase> {
		const now = new Date();
		const row = await this.prisma.agentEvaluationCase.create({
			data: { ...data, createdAt: now, updatedAt: now },
		});
		return mapCaseRow(row);
	}

	async updateCase(
		id: string,
		patch: Partial<{
			name: string;
			description: string | null;
			inputPrompt: string;
			expectedBehaviorsJson: string;
			expectedArtifactsJson: string | null;
			expectedToolsJson: string | null;
			category: string;
			priority: string;
			status: string;
			metadataJson: string | null;
		}>,
	): Promise<AgentEvaluationCase> {
		const row = await this.prisma.agentEvaluationCase.update({
			where: { id },
			data: { ...patch, updatedAt: new Date() },
		});
		return mapCaseRow(row);
	}

	async createRun(data: {
		id: string;
		agentSlug: string;
		promptTemplateId?: string | null;
		skillPackId?: string | null;
		status: string;
		totalCases: number;
		passedCases: number;
		failedCases: number;
		score: number;
		startedAt: Date;
		metadataJson?: string;
	}): Promise<AgentEvaluationRun> {
		const row = await this.prisma.agentEvaluationRun.create({ data });
		return this.getRunById(row.id) as Promise<AgentEvaluationRun>;
	}

	async updateRun(
		id: string,
		patch: Partial<{
			status: string;
			passedCases: number;
			failedCases: number;
			score: number;
			completedAt: Date | null;
			resultJson: string | null;
			error: string | null;
			metadataJson: string | null;
		}>,
	): Promise<void> {
		await this.prisma.agentEvaluationRun.update({ where: { id }, data: patch });
	}

	async createCaseResult(data: {
		id: string;
		evaluationRunId: string;
		evaluationCaseId: string;
		status: string;
		score: number;
		inputPrompt: string;
		actualAnswer?: string | null;
		expectedSummary?: string | null;
		toolResultsJson?: string | null;
		artifactResultsJson?: string | null;
		issuesJson?: string | null;
		createdAt: Date;
	}): Promise<void> {
		await this.prisma.agentEvaluationCaseResult.create({ data });
	}

	async listRuns(agentSlug?: string, limit = 50): Promise<AgentEvaluationRun[]> {
		const rows = await this.prisma.agentEvaluationRun.findMany({
			where: agentSlug ? { agentSlug } : undefined,
			orderBy: { startedAt: 'desc' },
			take: limit,
			include: { caseResults: { orderBy: { createdAt: 'asc' } } },
		});
		return rows.map((r) => ({
			id: r.id,
			agentSlug: r.agentSlug,
			promptTemplateId: r.promptTemplateId ?? undefined,
			skillPackId: r.skillPackId ?? undefined,
			status: r.status as AgentEvaluationRun['status'],
			totalCases: r.totalCases,
			passedCases: r.passedCases,
			failedCases: r.failedCases,
			score: r.score,
			startedAt: r.startedAt.toISOString(),
			completedAt: r.completedAt?.toISOString(),
			results: r.caseResults.map(mapResultRow),
			error: r.error ?? undefined,
			metadata: parseMeta(r.metadataJson),
		}));
	}

	async getRunById(id: string): Promise<AgentEvaluationRun | null> {
		const r = await this.prisma.agentEvaluationRun.findUnique({
			where: { id },
			include: { caseResults: { orderBy: { createdAt: 'asc' } } },
		});
		if (!r) return null;
		return {
			id: r.id,
			agentSlug: r.agentSlug,
			promptTemplateId: r.promptTemplateId ?? undefined,
			skillPackId: r.skillPackId ?? undefined,
			status: r.status as AgentEvaluationRun['status'],
			totalCases: r.totalCases,
			passedCases: r.passedCases,
			failedCases: r.failedCases,
			score: r.score,
			startedAt: r.startedAt.toISOString(),
			completedAt: r.completedAt?.toISOString(),
			results: r.caseResults.map(mapResultRow),
			error: r.error ?? undefined,
			metadata: parseMeta(r.metadataJson),
		};
	}

	async latestRunScore(agentSlug: string): Promise<{ score: number; runId: string; at: string } | null> {
		const r = await this.prisma.agentEvaluationRun.findFirst({
			where: { agentSlug, status: 'completed' },
			orderBy: { completedAt: 'desc' },
		});
		if (!r) return null;
		return { score: r.score, runId: r.id, at: (r.completedAt ?? r.startedAt).toISOString() };
	}

	async countActiveIntelligence(agentSlug: string): Promise<{
		prompts: number;
		skillPacks: number;
		workflows: number;
		evalCases: number;
	}> {
		const [prompts, skillPacks, workflows, evalCases] = await Promise.all([
			this.prisma.agentPromptTemplate.count({
				where: { agentSlug, status: 'active', type: 'system' },
			}),
			this.prisma.agentSkillPack.count({ where: { agentSlug, status: 'active' } }),
			this.prisma.agentWorkflowTemplate.count({ where: { agentSlug, status: 'active' } }),
			this.prisma.agentEvaluationCase.count({ where: { agentSlug, status: 'active' } }),
		]);
		return { prompts, skillPacks, workflows, evalCases };
	}
}
