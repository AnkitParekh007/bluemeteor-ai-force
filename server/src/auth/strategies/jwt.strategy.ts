import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfigService } from '../../config/app-config.service';
import type { AuthUser } from '../models/auth-user.model';
import { RbacService } from '../services/rbac.service';

interface JwtPayload {
	readonly sub: string;
	readonly email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly rbac: RbacService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: cfg.jwtAccessSecret || 'dev-insecure-placeholder',
		});
	}

	async validate(payload: JwtPayload): Promise<AuthUser> {
		const user = await this.rbac.loadAuthUser(payload.sub);
		if (!user || user.status !== 'active') {
			throw new UnauthorizedException();
		}
		return user;
	}
}
