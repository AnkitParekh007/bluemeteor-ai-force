import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthTokens, AuthUser } from './models/auth-user.model';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { UserRepository } from './repositories/user.repository';
import { PasswordService } from './services/password.service';
import { RbacService } from './services/rbac.service';
import { TokenService, type TokenPair } from './services/token.service';
import { UserService } from './services/user.service';

@Injectable()
export class AuthService {
	constructor(
		private readonly config: AppConfigService,
		private readonly passwords: PasswordService,
		private readonly tokens: TokenService,
		private readonly refreshRepo: RefreshTokenRepository,
		private readonly users: UserRepository,
		private readonly roles: RoleRepository,
		private readonly permissionRepo: PermissionRepository,
		private readonly rbac: RbacService,
		private readonly userService: UserService,
	) {}

	async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
		const row = await this.users.findByEmail(dto.email.toLowerCase());
		if (!row) throw new UnauthorizedException('Invalid credentials');
		if (row.status === 'disabled') throw new ForbiddenException('Account disabled');
		const ok = await this.passwords.verify(dto.password, row.passwordHash);
		if (!ok) throw new UnauthorizedException('Invalid credentials');
		await this.users.touchLastLogin(row.id);
		const user = await this.rbac.loadAuthUser(row.id);
		if (!user) throw new UnauthorizedException('Invalid credentials');
		const pair = await this.issueTokens(row.id, row.email);
		return { user, tokens: this.toAuthTokens(pair) };
	}

	async refresh(refreshToken: string): Promise<{ tokens: AuthTokens }> {
		const hash = this.tokens.hashRefreshToken(refreshToken);
		const row = await this.refreshRepo.findValidByHash(hash);
		if (!row) throw new UnauthorizedException('Invalid refresh token');
		const u = await this.users.findById(row.userId);
		if (!u || u.status === 'disabled') {
			await this.refreshRepo.revokeById(row.id);
			throw new ForbiddenException('Account disabled');
		}
		await this.refreshRepo.revokeById(row.id);
		const pair = await this.issueTokens(u.id, u.email);
		return { tokens: this.toAuthTokens(pair) };
	}

	async logout(userId: string, refreshToken?: string): Promise<void> {
		if (refreshToken) {
			const hash = this.tokens.hashRefreshToken(refreshToken);
			const row = await this.refreshRepo.findValidByHash(hash);
			if (row && row.userId === userId) await this.refreshRepo.revokeById(row.id);
		}
	}

	async me(userId: string): Promise<AuthUser> {
		const u = await this.rbac.loadAuthUser(userId);
		if (!u) throw new UnauthorizedException();
		return u;
	}

	async getPermissionSummary(userId: string) {
		const u = await this.rbac.loadAuthUser(userId);
		if (!u) throw new UnauthorizedException();
		return { permissions: u.permissions, agentAccess: u.agentAccess, roles: u.roles };
	}

	async listUsers() {
		return this.users.listWithRoles();
	}

	async createUser(dto: CreateUserDto, actorId: string) {
		return this.userService.createUser(dto, actorId);
	}

	async updateUser(userId: string, dto: UpdateUserDto, actorId: string) {
		return this.userService.updateUser(userId, dto, actorId);
	}

	async disableUser(userId: string, actorId: string) {
		if (userId === actorId) throw new BadRequestException('Cannot disable self');
		return this.userService.disableUser(userId, actorId);
	}

	async listRoles() {
		return this.roles.listAll();
	}

	async listAllPermissions() {
		return this.permissionRepo.listAll();
	}

	async runtimeStats(): Promise<Record<string, unknown>> {
		const [userCount, roleCount, permCount, activeRt] = await Promise.all([
			this.users.count(),
			this.roles.count(),
			this.permissionRepo.count(),
			this.refreshRepo.countActive(),
		]);
		return {
			usersCount: userCount,
			rolesCount: roleCount,
			permissionsCount: permCount,
			activeSessionsCount: activeRt,
			rbacEnabled: this.config.enableRbac,
			rateLimitingEnabled: this.config.enableRateLimiting,
			demoUsersEnabled: this.config.authDemoUsersEnabled,
		};
	}

	private async issueTokens(userId: string, email: string): Promise<TokenPair> {
		const accessTtl = this.config.jwtAccessExpiresIn;
		const refreshTtl = this.config.jwtRefreshExpiresIn;
		const pair = this.tokens.issueTokens({ sub: userId, email }, accessTtl, refreshTtl);
		const expiresAt = new Date(Date.now() + this.parseDurationMs(refreshTtl));
		await this.refreshRepo.create({
			userId,
			tokenHash: this.tokens.hashRefreshToken(pair.refreshToken),
			expiresAt,
		});
		return pair;
	}

	private toAuthTokens(pair: TokenPair): AuthTokens {
		return {
			accessToken: pair.accessToken,
			refreshToken: pair.refreshToken,
			expiresIn: pair.expiresIn,
			tokenType: 'Bearer',
		};
	}

	private parseDurationMs(s: string): number {
		const m = /^(\d+)([smhd])$/i.exec(s.trim());
		if (!m) return 7 * 24 * 3600 * 1000;
		const n = Number(m[1]);
		const u = m[2].toLowerCase();
		if (u === 's') return n * 1000;
		if (u === 'm') return n * 60 * 1000;
		if (u === 'h') return n * 3600 * 1000;
		if (u === 'd') return n * 86400 * 1000;
		return n * 1000;
	}
}
