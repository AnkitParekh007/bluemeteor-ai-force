import { Injectable, NotFoundException } from '@nestjs/common';

import { isoNow } from '../../common/utils/dates';
import { newId } from '../../common/utils/ids';
import type { AgentMessage } from '../models/agent-message.model';
import type { AgentSession, AgentSessionStatus, AgentWorkspaceMode } from '../models/agent-session.model';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { AgentSessionRepository } from '../repositories/agent-session.repository';

@Injectable()
export class AgentSessionService {
	constructor(
		private readonly sessions: AgentSessionRepository,
		private readonly messages: AgentMessageRepository,
	) {}

	async createSession(agentSlug: string, mode: AgentWorkspaceMode): Promise<AgentSession> {
		const t = new Date();
		return this.sessions.create({
			id: newId('sess'),
			agentSlug,
			title: 'New session',
			mode,
			status: 'idle',
			createdAt: t,
			updatedAt: t,
			preview: 'Empty session',
		});
	}

	async listSessions(agentSlug: string): Promise<AgentSession[]> {
		return this.sessions.listByAgentSlug(agentSlug);
	}

	async getSession(sessionId: string): Promise<AgentSession> {
		const s = await this.sessions.findById(sessionId);
		if (!s) throw new NotFoundException(`Session ${sessionId} not found`);
		return s;
	}

	async addMessage(_sessionId: string, message: AgentMessage): Promise<void> {
		await this.messages.create(message);
	}

	async listMessages(sessionId: string): Promise<AgentMessage[]> {
		return this.messages.listBySessionId(sessionId);
	}

	async updateSessionStatus(sessionId: string, status: AgentSessionStatus): Promise<void> {
		await this.sessions.update(sessionId, { status, updatedAt: new Date() });
	}

	async updateSessionPreview(sessionId: string, preview: string): Promise<void> {
		await this.sessions.update(sessionId, { preview, updatedAt: new Date() });
	}

	async incrementMessageCount(sessionId: string): Promise<void> {
		await this.sessions.incrementMessageCount(sessionId, new Date());
	}
}
