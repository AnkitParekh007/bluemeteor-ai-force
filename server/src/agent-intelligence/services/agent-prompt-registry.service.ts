import { BadRequestException, Injectable } from '@nestjs/common';

import { MAX_PROMPT_TEMPLATE_CHARS } from '../constants/evaluation-safety';
import type {
	AgentPromptTemplate,
	AgentPromptTemplateStatus,
	AgentPromptTemplateType,
	AgentPromptVariable,
	RenderedPrompt,
	RenderPromptInput,
} from '../models/agent-prompt-template.model';
import { AgentPromptTemplateRepository } from '../repositories/agent-prompt-template.repository';
import { newId } from '../../common/utils/ids';

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

@Injectable()
export class AgentPromptRegistryService {
	constructor(private readonly repo: AgentPromptTemplateRepository) {}

	async listTemplates(agentSlug?: string): Promise<AgentPromptTemplate[]> {
		return this.repo.findMany(agentSlug);
	}

	async getTemplate(templateId: string): Promise<AgentPromptTemplate | null> {
		return this.repo.findById(templateId);
	}

	async getActiveTemplate(
		agentSlug: string,
		type: AgentPromptTemplateType,
	): Promise<AgentPromptTemplate | null> {
		return this.repo.findActiveByAgentAndType(agentSlug, type);
	}

	async createTemplate(input: {
		agentSlug: string;
		name: string;
		description?: string;
		version: string;
		status?: AgentPromptTemplateStatus;
		type: AgentPromptTemplateType;
		content: string;
		variables?: AgentPromptVariable[];
		createdByUserId?: string;
		metadata?: Record<string, unknown>;
	}): Promise<AgentPromptTemplate> {
		this.assertPromptSize(input.content);
		const id = newId('apt');
		return this.repo.create({
			id,
			agentSlug: input.agentSlug,
			name: input.name,
			description: input.description,
			version: input.version,
			status: input.status ?? 'draft',
			type: input.type,
			content: input.content,
			variablesJson: JSON.stringify(input.variables ?? []),
			createdByUserId: input.createdByUserId,
			metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined,
		});
	}

	async updateTemplate(
		templateId: string,
		patch: Partial<{
			name: string;
			description: string | null;
			version: string;
			status: string;
			type: string;
			content: string;
			variables: AgentPromptVariable[];
			metadata: Record<string, unknown> | null;
		}>,
	): Promise<AgentPromptTemplate> {
		if (patch.content !== undefined) this.assertPromptSize(patch.content);
		return this.repo.update(templateId, {
			...(patch.name !== undefined ? { name: patch.name } : {}),
			...(patch.description !== undefined ? { description: patch.description } : {}),
			...(patch.version !== undefined ? { version: patch.version } : {}),
			...(patch.status !== undefined ? { status: patch.status } : {}),
			...(patch.type !== undefined ? { type: patch.type } : {}),
			...(patch.content !== undefined ? { content: patch.content } : {}),
			...(patch.variables !== undefined ? { variablesJson: JSON.stringify(patch.variables) } : {}),
			...(patch.metadata !== undefined
				? { metadataJson: patch.metadata ? JSON.stringify(patch.metadata) : null }
				: {}),
		});
	}

	async activateTemplate(templateId: string): Promise<AgentPromptTemplate> {
		const t = await this.repo.findById(templateId);
		if (!t) throw new BadRequestException('Template not found');
		await this.repo.archiveOthersSameType(t.agentSlug, t.type, templateId);
		return this.repo.update(templateId, { status: 'active' });
	}

	async archiveTemplate(templateId: string): Promise<AgentPromptTemplate> {
		return this.repo.update(templateId, { status: 'archived' });
	}

	async renderTemplate(input: RenderPromptInput): Promise<RenderedPrompt> {
		const tpl =
			(await this.repo.findActiveByAgentAndType(input.agentSlug, input.templateType)) ??
			(await this.findDraftForRender(input.agentSlug, input.templateType));
		if (!tpl) {
			return {
				templateId: '',
				version: '',
				content: '',
				missingVariables: [],
			};
		}
		return this.renderContent(tpl, input.variables);
	}

	/** Render a specific template body (for preview) */
	renderContent(template: AgentPromptTemplate, variables: Record<string, unknown>): RenderedPrompt {
		this.assertPromptSize(template.content);
		const missing: string[] = [];
		let content = template.content;
		const declared = new Map(template.variables.map((v) => [v.key, v]));
		const replaceOne = (key: string): string => {
			if (Object.prototype.hasOwnProperty.call(variables, key) && variables[key] !== undefined && variables[key] !== null) {
				return String(variables[key]);
			}
			const decl = declared.get(key);
			if (decl?.defaultValue !== undefined) return decl.defaultValue;
			if (decl?.required) missing.push(key);
			return '';
		};
		content = content.replace(VAR_RE, (_m, key: string) => replaceOne(key));
		return {
			templateId: template.id,
			version: template.version,
			content,
			missingVariables: [...new Set(missing)],
		};
	}

	private async findDraftForRender(agentSlug: string, type: string): Promise<AgentPromptTemplate | null> {
		const all = await this.repo.findMany(agentSlug);
		return (
			all.find((t) => t.type === type && t.status === 'testing') ??
			all.find((t) => t.type === type && t.status === 'draft') ??
			null
		);
	}

	private assertPromptSize(content: string): void {
		if (content.length > MAX_PROMPT_TEMPLATE_CHARS) {
			throw new BadRequestException(`Prompt content exceeds ${MAX_PROMPT_TEMPLATE_CHARS} characters`);
		}
	}
}
