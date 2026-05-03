import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { RoleRepository } from '../repositories/role.repository';
import { UserAgentAccessRepository } from '../repositories/user-agent-access.repository';
import { UserRepository } from '../repositories/user.repository';
import { PasswordService } from './password.service';

const STRONG_PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

@Injectable()
export class UserService {
	constructor(
		private readonly users: UserRepository,
		private readonly roles: RoleRepository,
		private readonly agentAccess: UserAgentAccessRepository,
		private readonly passwords: PasswordService,
		private readonly cfg: AppConfigService,
	) {}

	async createUser(dto: CreateUserDto, _actorId: string): Promise<{ id: string }> {
		this.assertPasswordPolicy(dto.password);
		const existing = await this.users.findByEmail(dto.email);
		if (existing) throw new BadRequestException('Email already registered');
		const hash = await this.passwords.hash(dto.password);
		const { id } = await this.users.create({
			email: dto.email,
			name: dto.name,
			passwordHash: hash,
			status: 'active',
			department: dto.department,
			jobTitle: dto.jobTitle,
		});
		if (dto.roleKey) {
			const role = await this.roles.findByKey(dto.roleKey);
			if (!role) throw new BadRequestException(`Unknown role ${dto.roleKey}`);
			await this.roles.assignRole(id, role.id);
		}
		return { id };
	}

	async updateUser(userId: string, dto: UpdateUserDto, _actorId: string): Promise<void> {
		const u = await this.users.findById(userId);
		if (!u) throw new NotFoundException('User not found');
		await this.users.update(userId, {
			...(dto.name !== undefined ? { name: dto.name } : {}),
			...(dto.department !== undefined ? { department: dto.department } : {}),
			...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
			...(dto.status !== undefined ? { status: dto.status } : {}),
		});
	}

	async disableUser(userId: string, actorId: string): Promise<void> {
		if (userId === actorId) throw new ForbiddenException('Cannot disable own account');
		const u = await this.users.findById(userId);
		if (!u) throw new NotFoundException('User not found');
		await this.users.update(userId, { status: 'disabled' });
	}

	private assertPasswordPolicy(password: string): void {
		if (!this.cfg.authRequireStrongPassword) return;
		if (!STRONG_PW.test(password)) {
			throw new BadRequestException(
				'Password must be at least 12 characters and include upper, lower, and digit.',
			);
		}
	}
}
