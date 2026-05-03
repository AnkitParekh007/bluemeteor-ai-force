import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AppConfigService } from '../../config/app-config.service';
import { newId } from '../../common/utils/ids';

export interface StreamTokenClaims {
	readonly tokenId: string;
	readonly userId: string;
	readonly sessionId: string;
	readonly runId: string;
	readonly agentSlug: string;
}

@Injectable()
export class AgentStreamTokenService {
	constructor(
		private readonly jwt: JwtService,
		private readonly cfg: AppConfigService,
	) {}

	async createStreamToken(
		input: Omit<StreamTokenClaims, 'tokenId'>,
	): Promise<{ token: string; expiresAt: string }> {
		const tokenId = newId('stk');
		const expMs = Date.now() + this.cfg.streamTokenTtlSeconds * 1000;
		const expiresAt = new Date(expMs).toISOString();
		const token = await this.jwt.signAsync(
			{
				...input,
				tokenId,
				typ: 'bm_sse',
			},
			{
				secret: this.cfg.streamTokenSecret,
				expiresIn: this.cfg.streamTokenTtlSeconds,
			},
		);
		return { token, expiresAt };
	}

	async verifyStreamToken(token: string | undefined): Promise<StreamTokenClaims> {
		if (!token?.trim()) throw new UnauthorizedException('streamToken required');
		try {
			const p = await this.jwt.verifyAsync<StreamTokenClaims & { typ?: string }>(token.trim(), {
				secret: this.cfg.streamTokenSecret,
			});
			if (p.typ !== 'bm_sse') throw new UnauthorizedException('Invalid stream token');
			return {
				tokenId: p.tokenId,
				userId: p.userId,
				sessionId: p.sessionId,
				runId: p.runId,
				agentSlug: p.agentSlug,
			};
		} catch {
			throw new UnauthorizedException('Invalid or expired stream token');
		}
	}

	async assertTokenMatchesRun(claims: StreamTokenClaims, sessionId: string, runId: string): Promise<void> {
		if (claims.sessionId !== sessionId || claims.runId !== runId) {
			throw new UnauthorizedException('Stream token scope mismatch');
		}
	}
}
