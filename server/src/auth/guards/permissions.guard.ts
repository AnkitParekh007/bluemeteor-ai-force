import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppConfigService } from '../../config/app-config.service';
import { PERMISSIONS_KEY } from '../auth.constants';
import type { AuthUser } from '../models/auth-user.model';
import { RbacService } from '../services/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly rbac: RbacService,
		private readonly cfg: AppConfigService,
	) {}

	canActivate(context: ExecutionContext): boolean {
		if (!this.cfg.enableRbac) return true;
		const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!required?.length) return true;
		const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
		const user = req.user;
		if (!user) throw new ForbiddenException();
		for (const key of required) {
			if (!this.rbac.hasPermissionSync(user, key)) {
				throw new ForbiddenException(`Missing permission: ${key}`);
			}
		}
		return true;
	}
}
