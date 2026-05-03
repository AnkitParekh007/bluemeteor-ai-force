/** Minimal agent catalog models (aligned with AI Employee Force mock roster). */

export type AgentCategory =
	| 'engineering'
	| 'product'
	| 'leadership'
	| 'operations'
	| 'support'
	| 'knowledge'
	| 'finance';

export interface Capability {
	title: string;
	description: string;
}

export type AgentTier = 'free' | 'pro' | 'premium' | 'enterprise';

export interface Agent {
	slug: string;
	name: string;
	roleTitle: string;
	category: AgentCategory;
	tier: AgentTier;
	categoryLabel: string;
	shortDescription: string;
	heroTagline: string;
	longDescription: string;
	capabilities: Capability[];
	tools: string[];
	skillDomains: string[];
	useCases: string[];
	whyMatters: string;
	relatedKeywords: string[];
}
