import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { newId } from '../../common/utils/ids';
import { PermissionRepository } from '../repositories/permission.repository';
import { RoleRepository } from '../repositories/role.repository';
import { UserAgentAccessRepository } from '../repositories/user-agent-access.repository';
import { UserRepository } from '../repositories/user.repository';
import { PasswordService } from './password.service';
import { DEMO_USERS, PERMISSION_CATALOG, ROLE_PERMISSION_MAP } from '../seed/permission-catalog';

const ROLE_NAMES: Readonly<Record<string, string>> = {
	admin: 'Admin',
	engineering_lead: 'Engineering Lead',
	frontend_engineer: 'Frontend Engineer',
	backend_engineer: 'Backend Engineer',
	qa_engineer: 'QA Engineer',
	product_manager: 'Product Manager',
	support_agent: 'Support Agent',
	data_analyst: 'Data Analyst',
	devops_engineer: 'DevOps Engineer',
	viewer: 'Viewer',
};

@Injectable()
export class AuthSeedService implements OnModuleInit {
	private readonly log = new Logger(AuthSeedService.name);

	constructor(
		private readonly cfg: AppConfigService,
		private readonly perms: PermissionRepository,
		private readonly roles: RoleRepository,
		private readonly users: UserRepository,
		private readonly agentAccess: UserAgentAccessRepository,
		private readonly passwords: PasswordService,
	) {}

	async onModuleInit(): Promise<void> {
		await this.seedCatalog();
		await this.seedDefaultAdmin();
		if (this.cfg.isDevelopment && this.cfg.authDemoUsersEnabled) {
			await this.seedDemoUsers();
		} else if (!this.cfg.isDevelopment) {
			this.log.log('Skipping demo user seed (non-development).');
		} else {
			this.log.log('Demo user seed disabled (AUTH_DEMO_USERS_ENABLED=false).');
		}
	}

	private async seedCatalog(): Promise<void> {
		for (const p of PERMISSION_CATALOG) {
			await this.perms.upsertPermission({
				key: p.key,
				name: p.name,
				category: p.category,
			});
		}
		const permIds = await this.perms.findIdsByKeys(PERMISSION_CATALOG.map((x) => x.key));
		for (const [roleKey, permKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
			const roleName = ROLE_NAMES[roleKey] ?? roleKey;
			const { id: roleId } = await this.roles.upsertRole({
				key: roleKey,
				name: roleName,
				description: `Seeded role ${roleKey}`,
			});
			for (const pk of permKeys) {
				const pid = permIds.get(pk);
				if (pid) await this.perms.linkRolePermission(roleId, pid);
			}
		}
	}

	private async seedDefaultAdmin(): Promise<void> {
		const email = this.cfg.defaultAdminEmail.toLowerCase();
		const existing = await this.users.findByEmail(email);
		if (existing) return;
		const hash = await this.passwords.hash(this.cfg.defaultAdminPassword);
		const { id } = await this.users.create({
			email,
			name: this.cfg.defaultAdminName,
			passwordHash: hash,
			status: 'active',
		});
		const adminRole = await this.roles.findByKey('admin');
		if (adminRole) await this.roles.assignRole(id, adminRole.id);
		const demoMatch = DEMO_USERS.find((d) => d.email.toLowerCase() === email);
		for (const row of demoMatch?.agentAccess ?? []) {
			await this.agentAccess.upsert(id, row.agentSlug, row.accessLevel);
		}
		this.log.log(`Created default admin user ${email}`);
	}

	private async seedDemoUsers(): Promise<void> {
		for (const demo of DEMO_USERS) {
			const email = demo.email.toLowerCase();
			const row = await this.users.findByEmail(email);
			if (row) continue;
			const hash = await this.passwords.hash(demo.password);
			const { id } = await this.users.create({
				email,
				name: demo.name,
				passwordHash: hash,
				status: 'active',
			});
			const role = await this.roles.findByKey(demo.roleKey);
			if (role) await this.roles.assignRole(id, role.id);
			for (const a of demo.agentAccess) {
				await this.agentAccess.upsert(id, a.agentSlug, a.accessLevel);
			}
			this.log.log(`Seeded demo user ${email}`);
		}
	}
}
