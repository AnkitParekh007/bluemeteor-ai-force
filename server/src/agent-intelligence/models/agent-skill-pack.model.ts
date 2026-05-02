export type AgentSkillPackStatus = 'draft' | 'active' | 'disabled' | 'archived';

export interface AgentSkillPack {
	id: string;
	agentSlug: string;
	key: string;
	name: string;
	description?: string;
	status: AgentSkillPackStatus;
	toolIds: string[];
	promptTemplateIds: string[];
	workflowTemplateIds: string[];
	knowledgeSources: string[];
	createdAt: string;
	updatedAt: string;
	metadata?: Record<string, unknown>;
}
