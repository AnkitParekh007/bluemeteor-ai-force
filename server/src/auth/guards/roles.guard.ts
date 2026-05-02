import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppConfigService } from '../../config/app-config.service';
import { ROLES_KEY } from '../auth.constants';
import type { AuthUser } from '../models/auth-user.model';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly cfg: AppConfigService,
	) {}

	canActivate(context: ExecutionContext): boolean {
		if (!this.cfg.enableRbac) return true;
		const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!roles?.length) return true;
		const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
		const user = req.user;
		if (!user) throw new ForbiddenException();
		for (const r of roles) {
			if (user.roles.includes(r)) return true;
		}
		throw new ForbiddenException('Missing role');
	}
}
