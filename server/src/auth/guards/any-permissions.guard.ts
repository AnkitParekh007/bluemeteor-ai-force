import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppConfigService } from '../../config/app-config.service';
import { ANY_PERMISSIONS_KEY, IS_PUBLIC_KEY } from '../auth.constants';
import type { AuthUser } from '../models/auth-user.model';
import { RbacService } from '../services/rbac.service';

@Injectable()
export class AnyPermissionsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly rbac: RbacService,
		private readonly cfg: AppConfigService,
	) {}

	canActivate(context: ExecutionContext): boolean {
		if (!this.cfg.enableRbac) return true;
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const anyPerms = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!anyPerms?.length) return true;

		const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
		const user = req.user;
		if (!user) throw new ForbiddenException();

		if (user.permissions.includes('system.admin')) return true;
		for (const key of anyPerms) {
			if (this.rbac.hasPermissionSync(user, key)) return true;
		}
		throw new ForbiddenException('Missing required permission');
	}
}
