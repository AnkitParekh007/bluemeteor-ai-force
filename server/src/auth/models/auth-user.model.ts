export type AgentAccessLevel = 'none' | 'view' | 'use' | 'act' | 'admin';

export interface AgentAccessEntry {
	readonly agentSlug: string;
	readonly accessLevel: AgentAccessLevel;
}

export interface AuthUser {
	readonly id: string;
	readonly email: string;
	readonly name: string;
	readonly status: string;
	readonly department?: string;
	readonly jobTitle?: string;
	readonly avatarUrl?: string;
	readonly roles: string[];
	readonly permissions: string[];
	readonly agentAccess: AgentAccessEntry[];
}

export interface AuthTokens {
	readonly accessToken: string;
	readonly refreshToken: string;
	/** Access token lifetime in seconds. */
	readonly expiresIn: number;
	readonly tokenType: 'Bearer';
}
