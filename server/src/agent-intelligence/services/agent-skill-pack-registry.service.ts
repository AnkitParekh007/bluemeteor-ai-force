import { BadRequestException, Injectable } from '@nestjs/common';

import type { AgentSkillPack, AgentSkillPackStatus } from '../models/agent-skill-pack.model';
import { AgentSkillPackRepository } from '../repositories/agent-skill-pack.repository';
import { AgentWorkflowTemplateRepository } from '../repositories/agent-workflow-template.repository';
import { newId } from '../../common/utils/ids';

@Injectable()
export class AgentSkillPackRegistryService {
	constructor(
		private readonly repo: AgentSkillPackRepository,
		private readonly workflows: AgentWorkflowTemplateRepository,
	) {}

	async listSkillPacks(agentSlug?: string): Promise<AgentSkillPack[]> {
		return this.repo.findMany(agentSlug);
	}

	async getSkillPack(skillPackId: string): Promise<AgentSkillPack | null> {
		return this.repo.findById(skillPackId);
	}

	async getSkillPackByKey(agentSlug: string, key: string): Promise<AgentSkillPack | null> {
		return this.repo.findByAgentAndKey(agentSlug, key);
	}

	async getActiveSkillPacks(agentSlug: string): Promise<AgentSkillPack[]> {
		const all = await this.repo.findMany(agentSlug);
		return all.filter((p) => p.status === 'active');
	}

	async createSkillPack(input: {
		agentSlug: string;
		key: string;
		name: string;
		description?: string;
		status?: AgentSkillPackStatus;
		toolIds: string[];
		promptTemplateIds?: string[];
		workflowTemplateIds?: string[];
		knowledgeSources?: string[];
		metadata?: Record<string, unknown>;
	}): Promise<AgentSkillPack> {
		const existing = await this.repo.findByAgentAndKey(input.agentSlug, input.key);
		if (existing) throw new BadRequestException(`Skill pack key already exists: ${input.key}`);
		const id = newId('asp');
		return this.repo.create({
			id,
			agentSlug: input.agentSlug,
			key: input.key,
			name: input.name,
			description: input.description,
			status: input.status ?? 'draft',
			toolIdsJson: JSON.stringify(input.toolIds),
			promptTemplateIdsJson: JSON.stringify(input.promptTemplateIds ?? []),
			workflowTemplateIdsJson: JSON.stringify(input.workflowTemplateIds ?? []),
			knowledgeSourcesJson: JSON.stringify(input.knowledgeSources ?? []),
			metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined,
		});
	}

	async updateSkillPack(
		skillPackId: string,
		patch: Partial<{
			name: string;
			description: string | null;
			status: string;
			toolIds: string[];
			promptTemplateIds: string[];
			workflowTemplateIds: string[];
			knowledgeSources: string[];
			metadata: Record<string, unknown> | null;
		}>,
	): Promise<AgentSkillPack> {
		return this.repo.update(skillPackId, {
			...(patch.name !== undefined ? { name: patch.name } : {}),
			...(patch.description !== undefined ? { description: patch.description } : {}),
			...(patch.status !== undefined ? { status: patch.status } : {}),
			...(patch.toolIds !== undefined ? { toolIdsJson: JSON.stringify(patch.toolIds) } : {}),
			...(patch.promptTemplateIds !== undefined
				? { promptTemplateIdsJson: JSON.stringify(patch.promptTemplateIds) }
				: {}),
			...(patch.workflowTemplateIds !== undefined
				? { workflowTemplateIdsJson: JSON.stringify(patch.workflowTemplateIds) }
				: {}),
			...(patch.knowledgeSources !== undefined
				? { knowledgeSourcesJson: JSON.stringify(patch.knowledgeSources) }
				: {}),
			...(patch.metadata !== undefined
				? { metadataJson: patch.metadata ? JSON.stringify(patch.metadata) : null }
				: {}),
		});
	}

	async activateSkillPack(skillPackId: string): Promise<AgentSkillPack> {
		return this.repo.update(skillPackId, { status: 'active' });
	}

	async disableSkillPack(skillPackId: string): Promise<AgentSkillPack> {
		return this.repo.update(skillPackId, { status: 'disabled' });
	}

	/** Union of tool ids from all active skill packs (does not replace static config). */
	getToolIdsUnionForActivePacks(packs: AgentSkillPack[]): string[] {
		const s = new Set<string>();
		for (const p of packs) {
			if (p.status !== 'active') continue;
			for (const t of p.toolIds) s.add(t);
		}
		return [...s];
	}

	async getToolsForAgent(agentSlug: string): Promise<string[]> {
		const packs = await this.getActiveSkillPacks(agentSlug);
		return this.getToolIdsUnionForActivePacks(packs);
	}

	async getWorkflowsForAgent(agentSlug: string): Promise<string[]> {
		const packs = await this.getActiveSkillPacks(agentSlug);
		const ids = new Set<string>();
		for (const p of packs) {
			for (const w of p.workflowTemplateIds) ids.add(w);
		}
		const keys: string[] = [];
		for (const id of ids) {
			const wf = await this.workflows.findById(id);
			if (wf && wf.agentSlug === agentSlug && wf.status === 'active') keys.push(wf.key);
		}
		const allWf = await this.workflows.findMany(agentSlug);
		for (const w of allWf) {
			if (w.status === 'active' && !keys.includes(w.key)) keys.push(w.key);
		}
		return [...new Set(keys)];
	}

	isToolGrantedByActiveSkillPacks(agentSlug: string, toolId: string, packs: AgentSkillPack[]): boolean {
		for (const p of packs) {
			if (p.agentSlug !== agentSlug || p.status !== 'active') continue;
			if (p.toolIds.includes(toolId)) return true;
		}
		return false;
	}
}
