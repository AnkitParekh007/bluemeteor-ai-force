import { BadRequestException, Injectable } from '@nestjs/common';

import { MAX_WORKFLOW_STEPS } from '../constants/evaluation-safety';
import type { AgentWorkflowTemplate } from '../models/agent-workflow-template.model';
import { AgentWorkflowTemplateRepository } from '../repositories/agent-workflow-template.repository';
import { newId } from '../../common/utils/ids';

/** Keyword routing: first match wins (DB templates override by key). */
const WORKFLOW_MATCH_RULES: ReadonlyArray<{
	readonly agentSlug: string;
	readonly workflowKey: string;
	readonly test: RegExp;
}> = [
	{ agentSlug: 'testo', workflowKey: 'testo_login_smoke_test', test: /\b(login smoke|run login smoke|smoke test)\b/i },
	{ agentSlug: 'producto', workflowKey: 'producto_ticket_to_user_stories', test: /\b(user stor|ticket to stor|create stor)\b/i },
	{ agentSlug: 'dato', workflowKey: 'dato_failed_upload_report_sql', test: /\b(sql|failed upload|report sql|generate sql)\b/i },
	{ agentSlug: 'devopsy', workflowKey: 'devopsy_release_checklist', test: /\b(release checklist|deployment readiness|cicd risk)\b/i },
	{ agentSlug: 'fronto', workflowKey: 'fronto_component_generation', test: /\b(component|angular|primeng|supplier card)\b/i },
	{ agentSlug: 'backo', workflowKey: 'backo_api_contract_design', test: /\b(api contract|dto|session api|service boundary)\b/i },
	{ agentSlug: 'doco', workflowKey: 'doco_release_notes', test: /\b(release notes|onboarding doc|known issue doc)\b/i },
	{ agentSlug: 'supporto', workflowKey: 'supporto_customer_reply', test: /\b(customer reply|ticket summary|escalation)\b/i },
];

@Injectable()
export class AgentWorkflowTemplateService {
	constructor(private readonly repo: AgentWorkflowTemplateRepository) {}

	async listWorkflows(agentSlug?: string): Promise<AgentWorkflowTemplate[]> {
		return this.repo.findMany(agentSlug);
	}

	async getWorkflow(workflowId: string): Promise<AgentWorkflowTemplate | null> {
		return this.repo.findById(workflowId);
	}

	async getWorkflowByKey(agentSlug: string, key: string): Promise<AgentWorkflowTemplate | null> {
		return this.repo.findByAgentAndKey(agentSlug, key);
	}

	async getActiveWorkflows(agentSlug: string): Promise<AgentWorkflowTemplate[]> {
		const all = await this.repo.findMany(agentSlug);
		return all.filter((w) => w.status === 'active');
	}

	async createWorkflow(input: {
		agentSlug: string;
		key: string;
		name: string;
		description?: string;
		category: string;
		mode: AgentWorkflowTemplate['mode'];
		steps: AgentWorkflowTemplate['steps'];
		requiredTools?: string[];
		outputArtifactTypes?: string[];
		status?: AgentWorkflowTemplate['status'];
		metadata?: Record<string, unknown>;
	}): Promise<AgentWorkflowTemplate> {
		if (input.steps.length > MAX_WORKFLOW_STEPS) {
			throw new BadRequestException(`Workflow may have at most ${MAX_WORKFLOW_STEPS} steps`);
		}
		const existing = await this.repo.findByAgentAndKey(input.agentSlug, input.key);
		if (existing) throw new BadRequestException(`Workflow key exists: ${input.key}`);
		const id = newId('awf');
		return this.repo.create({
			id,
			agentSlug: input.agentSlug,
			key: input.key,
			name: input.name,
			description: input.description,
			category: input.category,
			mode: input.mode,
			stepsJson: JSON.stringify(input.steps.slice(0, MAX_WORKFLOW_STEPS)),
			requiredToolsJson: JSON.stringify(input.requiredTools ?? []),
			outputArtifactTypesJson: JSON.stringify(input.outputArtifactTypes ?? []),
			status: input.status ?? 'draft',
			metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined,
		});
	}

	async updateWorkflow(
		workflowId: string,
		patch: Partial<{
			name: string;
			description: string | null;
			category: string;
			mode: string;
			steps: AgentWorkflowTemplate['steps'];
			requiredTools: string[];
			outputArtifactTypes: string[];
			status: string;
			metadata: Record<string, unknown> | null;
		}>,
	): Promise<AgentWorkflowTemplate> {
		if (patch.steps && patch.steps.length > MAX_WORKFLOW_STEPS) {
			throw new BadRequestException(`Workflow may have at most ${MAX_WORKFLOW_STEPS} steps`);
		}
		return this.repo.update(workflowId, {
			...(patch.name !== undefined ? { name: patch.name } : {}),
			...(patch.description !== undefined ? { description: patch.description } : {}),
			...(patch.category !== undefined ? { category: patch.category } : {}),
			...(patch.mode !== undefined ? { mode: patch.mode } : {}),
			...(patch.steps !== undefined ? { stepsJson: JSON.stringify(patch.steps) } : {}),
			...(patch.requiredTools !== undefined
				? { requiredToolsJson: JSON.stringify(patch.requiredTools) }
				: {}),
			...(patch.outputArtifactTypes !== undefined
				? { outputArtifactTypesJson: JSON.stringify(patch.outputArtifactTypes) }
				: {}),
			...(patch.status !== undefined ? { status: patch.status } : {}),
			...(patch.metadata !== undefined
				? { metadataJson: patch.metadata ? JSON.stringify(patch.metadata) : null }
				: {}),
		});
	}

	async activateWorkflow(workflowId: string): Promise<AgentWorkflowTemplate> {
		return this.repo.update(workflowId, { status: 'active' });
	}

	async disableWorkflow(workflowId: string): Promise<AgentWorkflowTemplate> {
		return this.repo.update(workflowId, { status: 'disabled' });
	}

	async matchWorkflowForPrompt(
		agentSlug: string,
		message: string,
		mode: 'ask' | 'plan' | 'act',
	): Promise<AgentWorkflowTemplate | null> {
		const active = await this.getActiveWorkflows(agentSlug);
		for (const wf of active) {
			if (wf.mode !== mode && wf.mode === 'act' && mode !== 'act') continue;
			const metaHint = typeof wf.metadata?.['matchHint'] === 'string' ? String(wf.metadata['matchHint']) : '';
			if (metaHint && new RegExp(metaHint, 'i').test(message)) return wf;
		}
		for (const rule of WORKFLOW_MATCH_RULES) {
			if (rule.agentSlug !== agentSlug) continue;
			if (!rule.test.test(message)) continue;
			const wf = await this.repo.findByAgentAndKey(agentSlug, rule.workflowKey);
			if (wf && wf.status === 'active') return wf;
		}
		return null;
	}
}
