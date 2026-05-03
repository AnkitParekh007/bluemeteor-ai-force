import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthUser } from './models/auth-user.model';

@Controller('auth')
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Public()
	@Throttle({ login: { limit: 12, ttl: 60_000 } })
	@Post('login')
	login(@Body() dto: LoginDto) {
		return this.auth.login(dto);
	}

	@Public()
	@Throttle({ login: { limit: 30, ttl: 60_000 } })
	@Post('refresh')
	refresh(@Body() dto: RefreshTokenDto) {
		return this.auth.refresh(dto.refreshToken);
	}

	@Post('logout')
	logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto) {
		return this.auth.logout(user.id, dto.refreshToken);
	}

	@Get('me')
	me(@CurrentUser() user: AuthUser) {
		return this.auth.me(user.id);
	}

	@Get('permissions')
	permissions(@CurrentUser() user: AuthUser) {
		return this.auth.getPermissionSummary(user.id);
	}

	@Get('users')
	@RequirePermissions('users.view')
	listUsers() {
		return this.auth.listUsers();
	}

	@Post('users')
	@RequirePermissions('users.create')
	createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
		return this.auth.createUser(dto, user.id);
	}

	@Patch('users/:userId')
	@RequirePermissions('users.update')
	updateUser(
		@CurrentUser() user: AuthUser,
		@Param('userId') userId: string,
		@Body() dto: UpdateUserDto,
	) {
		return this.auth.updateUser(userId, dto, user.id);
	}

	@Post('users/:userId/disable')
	@RequirePermissions('users.disable')
	disableUser(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
		return this.auth.disableUser(userId, user.id);
	}

	@Get('roles')
	@RequirePermissions('users.view')
	listRoles() {
		return this.auth.listRoles();
	}

	@Get('permissions/all')
	@RequirePermissions('users.view')
	listAllPermissions() {
		return this.auth.listAllPermissions();
	}

	@Get('runtime/health')
	@RequirePermissions('system.debug.view')
	runtimeHealth() {
		return this.auth.runtimeStats();
	}
}
