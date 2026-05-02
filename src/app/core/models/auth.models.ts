/** Mirrors Nest `AuthUser` / permission payloads. */
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
	readonly expiresIn: number;
	readonly tokenType: 'Bearer';
}

export interface AuthSession {
	readonly user: AuthUser;
	readonly tokens: AuthTokens;
}

export interface AuthState {
	readonly user: AuthUser | null;
	readonly accessToken: string | null;
	readonly refreshToken: string | null;
	readonly isLoading: boolean;
	readonly error: string | null;
}
