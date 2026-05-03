export type AgentPromptTemplateType =
	| 'system'
	| 'developer'
	| 'tool_planning'
	| 'response_style'
	| 'evaluation'
	| 'artifact_generation';

export type AgentPromptTemplateStatus = 'draft' | 'active' | 'archived' | 'testing';

export interface AgentPromptVariable {
	key: string;
	description: string;
	required: boolean;
	defaultValue?: string;
}

export interface AgentPromptTemplate {
	id: string;
	agentSlug: string;
	name: string;
	description?: string;
	version: string;
	status: AgentPromptTemplateStatus;
	type: AgentPromptTemplateType;
	content: string;
	variables: AgentPromptVariable[];
	createdAt: string;
	updatedAt: string;
	createdByUserId?: string;
	metadata?: Record<string, unknown>;
}

export interface RenderPromptInput {
	agentSlug: string;
	templateType: AgentPromptTemplateType;
	variables: Record<string, unknown>;
}

export interface RenderedPrompt {
	templateId: string;
	version: string;
	content: string;
	missingVariables: string[];
}
