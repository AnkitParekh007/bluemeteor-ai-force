import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

export type SessionAccessResourceKind =
	| 'session'
	| 'run'
	| 'browserSession'
	| 'testRun'
	| 'artifact'
	| 'playwrightSpec';

@Injectable()
export class SessionAccessResolverService {
	constructor(private readonly prisma: PrismaService) {}

	async resolveAgentSlug(kind: SessionAccessResourceKind, id: string): Promise<string | null> {
		const trimmed = id?.trim();
		if (!trimmed) return null;
		switch (kind) {
			case 'session': {
				const row = await this.prisma.agentSession.findUnique({
					where: { id: trimmed },
					select: { agentSlug: true },
				});
				return row?.agentSlug ?? null;
			}
			case 'run': {
				const row = await this.prisma.agentRun.findUnique({
					where: { id: trimmed },
					select: { agentSlug: true },
				});
				return row?.agentSlug ?? null;
			}
			case 'browserSession': {
				const row = await this.prisma.browserSession.findUnique({
					where: { id: trimmed },
					select: { agentSlug: true },
				});
				return row?.agentSlug ?? null;
			}
			case 'testRun': {
				const row = await this.prisma.playwrightTestRun.findUnique({
					where: { id: trimmed },
					select: { agentSlug: true },
				});
				return row?.agentSlug ?? null;
			}
			case 'artifact': {
				const row = await this.prisma.agentArtifact.findUnique({
					where: { id: trimmed },
					select: { agentSlug: true },
				});
				return row?.agentSlug ?? null;
			}
			case 'playwrightSpec': {
				const row = await this.prisma.playwrightSpec.findUnique({
					where: { id: trimmed },
					select: { agentSlug: true },
				});
				return row?.agentSlug ?? null;
			}
			default:
				return null;
		}
	}
}
