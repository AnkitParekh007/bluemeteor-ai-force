import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppConfigService } from '../../config/app-config.service';
import { AGENT_ACCESS_KEY } from '../auth.constants';
import type { AgentAccessLevel, AuthUser } from '../models/auth-user.model';
import { RbacService } from '../services/rbac.service';

@Injectable()
export class AgentAccessGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly rbac: RbacService,
		private readonly cfg: AppConfigService,
	) {}

	canActivate(context: ExecutionContext): boolean {
		if (!this.cfg.enableRbac) return true;
		const min = this.reflector.getAllAndOverride<AgentAccessLevel>(AGENT_ACCESS_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!min) return true;
		const req = context
			.switchToHttp()
			.getRequest<{
				user?: AuthUser;
				params?: Record<string, string>;
				body?: { agentSlug?: string };
				query?: { agentSlug?: string };
			}>();
		const user = req.user;
		if (!user) throw new ForbiddenException();
		const slug =
			req.params?.agentSlug ?? req.body?.agentSlug ?? (req.query?.agentSlug as string | undefined);
		if (!slug) {
			throw new ForbiddenException('agentSlug required for this action');
		}
		if (!this.rbac.canAccessAgent(user, slug, min)) {
			throw new ForbiddenException('Agent access denied');
		}
		return true;
	}
}
