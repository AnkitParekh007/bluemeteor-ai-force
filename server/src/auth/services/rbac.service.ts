import { Injectable } from '@nestjs/common';

import type { AgentAccessLevel, AuthUser } from '../models/auth-user.model';
import { PermissionRepository } from '../repositories/permission.repository';
import { RoleRepository } from '../repositories/role.repository';
import { UserAgentAccessRepository } from '../repositories/user-agent-access.repository';
import { UserRepository } from '../repositories/user.repository';

const LEVEL_RANK: Record<AgentAccessLevel, number> = {
	none: 0,
	view: 1,
	use: 2,
	act: 3,
	admin: 4,
};

@Injectable()
export class RbacService {
	constructor(
		private readonly users: UserRepository,
		private readonly roles: RoleRepository,
		private readonly permissions: PermissionRepository,
		private readonly agentAccess: UserAgentAccessRepository,
	) {}

	async loadAuthUser(userId: string): Promise<AuthUser | null> {
		const row = await this.users.findById(userId);
		if (!row) return null;
		const permKeys = await this.permissions.permissionsForUser(userId);
		const roleKeys = await this.roles.listRolesForUser(userId);
		const agents = await this.agentAccess.listForUser(userId);
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			status: row.status,
			department: row.department ?? undefined,
			jobTitle: row.jobTitle ?? undefined,
			avatarUrl: row.avatarUrl ?? undefined,
			roles: roleKeys,
			permissions: permKeys,
			agentAccess: agents.map((a) => ({
				agentSlug: a.agentSlug,
				accessLevel: a.accessLevel as AgentAccessLevel,
			})),
		};
	}

	hasPermissionSync(user: AuthUser, key: string): boolean {
		if (user.permissions.includes('system.admin')) return true;
		return user.permissions.includes(key);
	}

	async hasPermission(user: AuthUser, key: string): Promise<boolean> {
		return this.hasPermissionSync(user, key);
	}

	async hasAllPermissions(user: AuthUser, keys: string[]): Promise<boolean> {
		for (const k of keys) {
			if (!this.hasPermissionSync(user, k)) return false;
		}
		return true;
	}

	canAccessAgent(user: AuthUser, agentSlug: string, min: AgentAccessLevel): boolean {
		if (user.permissions.includes('system.admin') || user.permissions.includes('agents.manage')) {
			return true;
		}
		const entry = user.agentAccess.find((a) => a.agentSlug === agentSlug);
		if (!entry) return min === 'view' && user.permissions.includes('agents.view');
		return LEVEL_RANK[entry.accessLevel] >= LEVEL_RANK[min];
	}
}
