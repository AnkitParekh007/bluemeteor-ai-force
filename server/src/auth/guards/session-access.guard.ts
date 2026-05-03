import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppConfigService } from '../../config/app-config.service';
import { SESSION_ACCESS_KEY } from '../auth.constants';
import type { SessionAccessMeta } from '../decorators/require-session-access.decorator';
import type { AuthUser } from '../models/auth-user.model';
import { RbacService } from '../services/rbac.service';
import { SessionAccessResolverService } from '../services/session-access-resolver.service';

@Injectable()
export class SessionAccessGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly rbac: RbacService,
		private readonly resolver: SessionAccessResolverService,
		private readonly cfg: AppConfigService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!this.cfg.enableRbac) return true;
		const access = this.reflector.getAllAndOverride<SessionAccessMeta>(SESSION_ACCESS_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!access) return true;
		const req = context.switchToHttp().getRequest<{
			user?: AuthUser;
			params?: Record<string, string>;
			body?: Record<string, unknown>;
			query?: Record<string, unknown>;
		}>();
		const user = req.user;
		if (!user) throw new ForbiddenException();
		const rawId = this.pickId(req, access);
		if (!rawId || typeof rawId !== 'string') {
			throw new ForbiddenException('Resource id required for access check');
		}
		const agentSlug = await this.resolver.resolveAgentSlug(access.kind, rawId);
		if (!agentSlug) throw new ForbiddenException('Resource not found');
		if (!this.rbac.canAccessAgent(user, agentSlug, access.level)) {
			throw new ForbiddenException('Session access denied');
		}
		return true;
	}

	private pickId(
		req: {
			params?: Record<string, string>;
			body?: Record<string, unknown>;
			query?: Record<string, unknown>;
		},
		access: SessionAccessMeta,
	): string | undefined {
		const src = access.source ?? 'params';
		if (src === 'body') {
			const v = req.body?.[access.param];
			return typeof v === 'string' ? v : undefined;
		}
		if (src === 'query') {
			const v = req.query?.[access.param];
			return typeof v === 'string' ? v : undefined;
		}
		const p = req.params?.[access.param];
		if (p) return p;
		const b = req.body?.[access.param];
		return typeof b === 'string' ? b : undefined;
	}
}
