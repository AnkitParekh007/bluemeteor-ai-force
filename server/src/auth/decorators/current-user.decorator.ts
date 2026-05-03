import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthUser } from '../models/auth-user.model';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
	const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
	return req.user;
});
