import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import type { ConnectorHealth } from '../models/connector.model';
import type { TicketDetail, TicketSummary } from '../models/ticket-connector.model';
import { TicketReaderService } from '../../internal-tools/services/ticket-reader.service';
import { MOCK_SUPPORT, mockSupportDetail } from './connector-mock-data';
import { ConnectorHttpService } from './connector-http.service';

@Injectable()
export class SupportTicketConnectorService {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly http: ConnectorHttpService,
		private readonly ticketReader: TicketReaderService,
	) {}

	isEnabled(): boolean {
		return this.cfg.enableConnectors;
	}

	private zendeskConfigured(): boolean {
		return !!this.cfg.zendeskBaseUrl && !!this.cfg.zendeskEmail && !!this.cfg.zendeskApiToken;
	}

	private snowConfigured(): boolean {
		return !!this.cfg.servicenowBaseUrl && !!this.cfg.servicenowUsername && !!this.cfg.servicenowPassword;
	}

	private zendeskAuth(): string {
		return `Basic ${Buffer.from(`${this.cfg.zendeskEmail}/token:${this.cfg.zendeskApiToken}`, 'utf8').toString('base64')}`;
	}

	private snowAuth(): string {
		return `Basic ${Buffer.from(`${this.cfg.servicenowUsername}:${this.cfg.servicenowPassword}`, 'utf8').toString('base64')}`;
	}

	async healthCheck(): Promise<ConnectorHealth> {
		const now = new Date().toISOString();
		if (!this.cfg.enableConnectors) {
			return { connectorId: 'support', status: 'disabled', message: 'Connectors disabled', checkedAt: now };
		}
		const p = this.cfg.supportConnectorProvider;
		if (p === 'mock' || (!this.zendeskConfigured() && !this.snowConfigured())) {
			return {
				connectorId: 'support',
				status: this.cfg.enableConnectorMockFallback ? 'enabled' : 'missing_config',
				message: 'Support connector using mock / internal reader',
				checkedAt: now,
				metadata: { provider: 'mock', mockFallback: this.cfg.enableConnectorMockFallback },
			};
		}
		try {
			if (p === 'zendesk' && this.zendeskConfigured()) {
				await this.http.getJson<unknown>(`${this.cfg.zendeskBaseUrl}/api/v2/users/me.json`, {
					authHeader: this.zendeskAuth(),
				});
				return { connectorId: 'support', status: 'healthy', message: 'Zendesk reachable', checkedAt: now, metadata: { provider: 'zendesk' } };
			}
			if (p === 'servicenow' && this.snowConfigured()) {
				await this.http.getJson<unknown>(`${this.cfg.servicenowBaseUrl}/api/now/table/sys_user?sysparm_limit=1`, {
					authHeader: this.snowAuth(),
				});
				return { connectorId: 'support', status: 'healthy', message: 'ServiceNow reachable', checkedAt: now, metadata: { provider: 'servicenow' } };
			}
		} catch (e) {
			return {
				connectorId: 'support',
				status: 'unhealthy',
				message: e instanceof Error ? e.message : 'error',
				checkedAt: now,
			};
		}
		return { connectorId: 'support', status: 'missing_config', message: 'Support provider not configured', checkedAt: now };
	}

	async searchTickets(query: string, limit?: number): Promise<TicketSummary[]> {
		const lim = Math.min(limit ?? this.cfg.connectorMaxResults, this.cfg.connectorMaxResults);
		const p = this.cfg.supportConnectorProvider;
		if (this.cfg.enableSupportConnector && p === 'zendesk' && this.zendeskConfigured()) {
			const url = `${this.cfg.zendeskBaseUrl}/api/v2/search.json?query=${encodeURIComponent(`type:ticket ${query}`)}`;
			const data = await this.http.getJson<{ results?: Array<Record<string, unknown>> }>(url, { authHeader: this.zendeskAuth() });
			return (data.results ?? []).slice(0, lim).map((t) => ({
				id: String(t['id'] ?? ''),
				key: String(t['id'] ?? ''),
				title: String(t['subject'] ?? ''),
				status: String(t['status'] ?? ''),
				updatedAt: String(t['updated_at'] ?? ''),
			}));
		}
		if (this.cfg.enableSupportConnector && p === 'servicenow' && this.snowConfigured()) {
			const q = query.replace(/'/g, "''");
			const url = `${this.cfg.servicenowBaseUrl}/api/now/table/incident?sysparm_limit=${lim}&sysparm_query=short_descriptionLIKE${encodeURIComponent(q)}`;
			const data = await this.http.getJson<{ result?: Array<Record<string, unknown>> }>(url, { authHeader: this.snowAuth() });
			return (data.result ?? []).map((t) => ({
				id: String(t['sys_id'] ?? ''),
				key: String(t['number'] ?? ''),
				title: String(t['short_description'] ?? ''),
				status: String(t['state'] ?? ''),
				updatedAt: String(t['sys_updated_on'] ?? ''),
			}));
		}
		if (this.cfg.enableConnectorMockFallback) {
			const q = query.toLowerCase();
			return MOCK_SUPPORT.filter((t) => !q || t.title.toLowerCase().includes(q)).slice(0, lim);
		}
		const internal = await this.ticketReader.searchTickets(query, lim);
		return internal.map((t) => ({
			id: t.id,
			key: t.id,
			title: t.title,
			status: t.status,
			priority: t.priority,
			updatedAt: t.createdAt,
		}));
	}

	async getTicket(ticketId: string): Promise<TicketDetail> {
		const p = this.cfg.supportConnectorProvider;
		if (this.cfg.enableSupportConnector && p === 'zendesk' && this.zendeskConfigured()) {
			const data = await this.http.getJson<{ ticket?: Record<string, unknown> }>(
				`${this.cfg.zendeskBaseUrl}/api/v2/tickets/${encodeURIComponent(ticketId)}.json`,
				{ authHeader: this.zendeskAuth() },
			);
			const t = data.ticket ?? {};
			return {
				id: String(t['id'] ?? ticketId),
				title: String(t['subject'] ?? ''),
				status: String(t['status'] ?? ''),
				description: typeof t['description'] === 'string' ? t['description'] : undefined,
			};
		}
		if (this.cfg.enableSupportConnector && p === 'servicenow' && this.snowConfigured()) {
			const url = `${this.cfg.servicenowBaseUrl}/api/now/table/incident?sysparm_query=sys_id=${encodeURIComponent(ticketId)}^ORnumber=${encodeURIComponent(ticketId)}&sysparm_limit=1`;
			const data = await this.http.getJson<{ result?: Array<Record<string, unknown>> }>(url, { authHeader: this.snowAuth() });
			const t = data.result?.[0] ?? {};
			return {
				id: String(t['sys_id'] ?? ticketId),
				key: String(t['number'] ?? ''),
				title: String(t['short_description'] ?? ''),
				status: String(t['state'] ?? ''),
				description: typeof t['description'] === 'string' ? t['description'] : undefined,
			};
		}
		if (this.cfg.enableConnectorMockFallback) return mockSupportDetail(ticketId);
		const t = await this.ticketReader.getTicket(ticketId);
		if (!t) return mockSupportDetail(ticketId);
		return {
			id: t.id,
			title: t.title,
			status: t.status,
			priority: t.priority,
			description: t.description,
			updatedAt: t.createdAt,
		};
	}

	async listRecentTickets(limit?: number): Promise<TicketSummary[]> {
		return this.searchTickets('', limit);
	}
}
