import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AgentAccessGuard } from './guards/agent-access.guard';
import { AnyPermissionsGuard } from './guards/any-permissions.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { SessionAccessGuard } from './guards/session-access.guard';
import { PermissionRepository } from './repositories/permission.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RoleRepository } from './repositories/role.repository';
import { UserAgentAccessRepository } from './repositories/user-agent-access.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthSeedService } from './services/auth-seed.service';
import { PasswordService } from './services/password.service';
import { RbacService } from './services/rbac.service';
import { SessionAccessResolverService } from './services/session-access-resolver.service';
import { TokenService } from './services/token.service';
import { UserService } from './services/user.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
	imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
	controllers: [AuthController],
	providers: [
		AuthService,
		AuthSeedService,
		PasswordService,
		TokenService,
		RbacService,
		UserService,
		JwtStrategy,
		UserRepository,
		RoleRepository,
		PermissionRepository,
		RefreshTokenRepository,
		UserAgentAccessRepository,
		JwtAuthGuard,
		PermissionsGuard,
		AnyPermissionsGuard,
		AgentAccessGuard,
		SessionAccessResolverService,
		SessionAccessGuard,
		RolesGuard,
	],
	exports: [
		AuthService,
		RbacService,
		JwtAuthGuard,
		PermissionsGuard,
		AnyPermissionsGuard,
		AgentAccessGuard,
		SessionAccessResolverService,
		SessionAccessGuard,
		RolesGuard,
		JwtModule,
		PassportModule,
	],
})
export class AuthModule {}
