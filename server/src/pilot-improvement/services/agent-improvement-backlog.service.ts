import { Injectable, NotFoundException } from '@nestjs/common';

import type { CreateImprovementItemDto } from '../dto/create-improvement-item.dto';
import type { UpdateImprovementItemDto } from '../dto/update-improvement-item.dto';
import type { ImprovementCategory, ImprovementPriority, ImprovementStatus } from '../models/agent-improvement-backlog.model';
import {
	AgentImprovementBacklogRepository,
	type BacklogFilters,
} from '../repositories/agent-improvement-backlog.repository';

@Injectable()
export class AgentImprovementBacklogService {
	constructor(private readonly repo: AgentImprovementBacklogRepository) {}

	async listItems(filters?: BacklogFilters) {
		return this.repo.list(300, filters);
	}

	async getItem(id: string) {
		const item = await this.repo.findById(id);
		if (!item) throw new NotFoundException(`Backlog item ${id} not found`);
		return item;
	}

	async createItem(dto: CreateImprovementItemDto) {
		return this.repo.create({
			agentSlug: dto.agentSlug,
			title: dto.title,
			description: dto.description,
			sourceType: dto.sourceType,
			sourceId: dto.sourceId,
			priority: dto.priority,
			status: 'new',
			category: dto.category,
			proposedChangeJson: dto.proposedChange
				? JSON.stringify(dto.proposedChange)
				: undefined,
			expectedImpact: dto.expectedImpact,
		});
	}

	async updateItem(id: string, dto: UpdateImprovementItemDto) {
		await this.getItem(id);
		return this.repo.update(id, {
			title: dto.title,
			description: dto.description,
			priority: dto.priority as ImprovementPriority | undefined,
			status: dto.status as ImprovementStatus | undefined,
			category: dto.category as ImprovementCategory | undefined,
			proposedChangeJson: dto.proposedChange
				? JSON.stringify(dto.proposedChange)
				: undefined,
			expectedImpact: dto.expectedImpact,
		});
	}

	async acceptItem(id: string) {
		await this.getItem(id);
		return this.repo.update(id, { status: 'accepted' });
	}

	async rejectItem(id: string) {
		await this.getItem(id);
		return this.repo.update(id, { status: 'rejected' });
	}

	async markInProgress(id: string) {
		await this.getItem(id);
		return this.repo.update(id, { status: 'in_progress' });
	}

	async markImplemented(id: string) {
		await this.getItem(id);
		return this.repo.update(id, { status: 'implemented', completedAt: new Date() });
	}

	async markValidated(id: string) {
		await this.getItem(id);
		return this.repo.update(id, { status: 'validated' });
	}

	async closeItem(id: string) {
		await this.getItem(id);
		return this.repo.update(id, { status: 'closed' });
	}

	async getBacklogStats() {
		const [byStatus, byCategory, openHigh] = await Promise.all([
			this.repo.countByStatus(),
			this.repo.countByCategory(),
			this.repo.countOpenHighPriority(),
		]);
		return { byStatus, byCategory, openHighPriorityCount: openHigh };
	}
}
