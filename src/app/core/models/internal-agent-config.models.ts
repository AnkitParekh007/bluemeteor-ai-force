export interface AgentToolPermission {
	readonly toolId: string;
	readonly name: string;
	readonly description: string;
	readonly enabled: boolean;
	readonly requiresApproval: boolean;
	readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentKnowledgeSource {
	readonly id: string;
	readonly name: string;
	readonly type: 'docs' | 'api' | 'database' | 'repository' | 'url' | 'manual';
	readonly description: string;
	readonly enabled: boolean;
}

export interface InternalAgentConfig {
	readonly slug: string;
	readonly displayName: string;
	readonly role: string;
	readonly department: string;
	readonly systemPrompt: string;
	readonly defaultMode: 'ask' | 'plan' | 'act';
	readonly allowedTools: AgentToolPermission[];
	readonly deniedTools: string[];
	readonly knowledgeSources: AgentKnowledgeSource[];
	readonly maxSteps: number;
	readonly maxToolCalls: number;
	readonly requiresApprovalFor: string[];
	readonly outputArtifactTypes: string[];
}
