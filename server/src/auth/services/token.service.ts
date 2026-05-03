import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

import { AppConfigService } from '../../config/app-config.service';

export interface AccessJwtPayload {
	readonly sub: string;
	readonly email: string;
}

export interface TokenPair {
	readonly accessToken: string;
	readonly refreshToken: string;
	/** Access token lifetime in seconds (for clients). */
	readonly expiresIn: number;
}

@Injectable()
export class TokenService {
	constructor(
		private readonly jwt: JwtService,
		private readonly cfg: AppConfigService,
	) {}

	hashRefreshToken(raw: string): string {
		return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
	}

	issueTokens(payload: AccessJwtPayload, accessTtl: string, _refreshTtl: string): TokenPair {
		const expiresInSec = this.parseDurationToSeconds(accessTtl);
		const accessToken = this.jwt.sign(
			{ sub: payload.sub, email: payload.email },
			{ secret: this.cfg.jwtAccessSecret, expiresIn: expiresInSec },
		);
		const refreshToken = crypto.randomBytes(48).toString('base64url');
		return {
			accessToken,
			refreshToken,
			expiresIn: expiresInSec,
		};
	}

	private parseDurationToSeconds(s: string): number {
		const m = /^(\d+)([smhd])$/i.exec(s.trim());
		if (!m) return 900;
		const n = Number(m[1]);
		const u = m[2].toLowerCase();
		if (u === 's') return n;
		if (u === 'm') return n * 60;
		if (u === 'h') return n * 3600;
		if (u === 'd') return n * 86400;
		return n;
	}
}
