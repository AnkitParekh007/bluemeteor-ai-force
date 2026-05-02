import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { readTextFileSafe, resolveSafePath } from '../../common/utils/safe-file-reader';
import type { TicketDetail, TicketFilter, TicketSummary } from '../models/ticket-tool.model';

interface MockTicketsFile {
	readonly tickets: TicketDetail[];
}

@Injectable()
export class TicketReaderService {
	private readonly log = new Logger(TicketReaderService.name);
	private cache: TicketDetail[] | null = null;

	constructor(private readonly cfg: AppConfigService) {}

	private async loadAll(): Promise<TicketDetail[]> {
		if (this.cache) return this.cache;
		if (this.cfg.ticketsProvider !== 'mock') {
			this.cache = [];
			return this.cache;
		}
		try {
			const rel = 'docs/mock-tickets.json';
			const abs = resolveSafePath(this.cfg.repositoryRootAbs, rel, this.cfg.repositoryAllowedPaths);
			const raw = await readTextFileSafe(abs, this.cfg.maxToolFileReadBytes);
			const parsed = JSON.parse(raw) as MockTicketsFile;
			this.cache = parsed.tickets ?? [];
		} catch (e) {
			this.log.warn(`mock tickets load failed: ${e instanceof Error ? e.message : e}`);
			this.cache = [];
		}
		return this.cache;
	}

	async listTickets(filter?: TicketFilter): Promise<TicketSummary[]> {
		if (!this.cfg.enableTicketReader) return [];
		const all = await this.loadAll();
		let rows = all;
		if (filter?.status) rows = rows.filter((t) => t.status === filter.status);
		if (filter?.area) rows = rows.filter((t) => t.area.toLowerCase() === filter.area!.toLowerCase());
		return rows.map((t) => ({
			id: t.id,
			title: t.title,
			status: t.status,
			priority: t.priority,
			area: t.area,
			createdAt: t.createdAt,
		}));
	}

	async getTicket(ticketId: string): Promise<TicketDetail | undefined> {
		if (!this.cfg.enableTicketReader) return undefined;
		const all = await this.loadAll();
		return all.find((t) => t.id === ticketId);
	}

	async searchTickets(query: string, limit = 20): Promise<TicketSummary[]> {
		if (!this.cfg.enableTicketReader) return [];
		const q = query.trim().toLowerCase();
		if (!q) return this.listTickets();
		const all = await this.loadAll();
		return all
			.filter(
				(t) =>
					t.title.toLowerCase().includes(q) ||
					t.description.toLowerCase().includes(q) ||
					t.area.toLowerCase().includes(q),
			)
			.slice(0, limit)
			.map((t) => ({
				id: t.id,
				title: t.title,
				status: t.status,
				priority: t.priority,
				area: t.area,
				createdAt: t.createdAt,
			}));
	}
}
