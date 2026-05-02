import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import type { ConnectorHealth } from '../models/connector.model';
import type { TicketDetail, TicketSummary } from '../models/ticket-connector.model';
import { MOCK_JIRA_TICKETS, mockJiraDetail } from './connector-mock-data';
import { ConnectorHttpService } from './connector-http.service';

@Injectable()
export class JiraConnectorService {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly http: ConnectorHttpService,
	) {}

	private authHeader(): string | undefined {
		const e = this.cfg.jiraEmail;
		const t = this.cfg.jiraApiToken;
		if (!e || !t) return undefined;
		return `Basic ${Buffer.from(`${e}:${t}`, 'utf8').toString('base64')}`;
	}

	private configured(): boolean {
		return this.cfg.enableJiraConnector && !!this.cfg.jiraBaseUrl && !!this.cfg.jiraEmail && !!this.cfg.jiraApiToken;
	}

	isEnabled(): boolean {
		return this.configured() || (this.cfg.enableConnectorMockFallback && this.cfg.enableConnectors);
	}

	private useMock(): boolean {
		return !this.configured() && this.cfg.enableConnectorMockFallback;
	}

	private projectAllowed(key: string): boolean {
		const keys = this.cfg.jiraProjectKeys;
		if (!keys.length) return true;
		const prefix = key.split('-')[0]?.toUpperCase() ?? '';
		return keys.includes(prefix);
	}

	async healthCheck(): Promise<ConnectorHealth> {
		const now = new Date().toISOString();
		if (!this.cfg.enableConnectors) {
			return { connectorId: 'jira', status: 'disabled', message: 'Connectors disabled', checkedAt: now };
		}
		if (!this.configured()) {
			return {
				connectorId: 'jira',
				status: this.cfg.enableConnectorMockFallback ? 'enabled' : 'missing_config',
				message: this.cfg.enableConnectorMockFallback ? 'Mock fallback (Jira not configured)' : 'Missing Jira config',
				checkedAt: now,
				metadata: { mockFallback: this.cfg.enableConnectorMockFallback },
			};
		}
		try {
			await this.http.getJson<unknown>(`${this.cfg.jiraBaseUrl}/rest/api/3/myself`, { authHeader: this.authHeader() });
			return { connectorId: 'jira', status: 'healthy', message: 'Jira API reachable', checkedAt: now };
		} catch (e) {
			return {
				connectorId: 'jira',
				status: 'unhealthy',
				message: e instanceof Error ? e.message : 'error',
				checkedAt: now,
			};
		}
	}

	async searchIssues(jqlOrText: string, limit?: number): Promise<TicketSummary[]> {
		const lim = Math.min(limit ?? this.cfg.connectorMaxResults, this.cfg.connectorMaxResults);
		if (this.useMock()) {
			const q = jqlOrText.toLowerCase();
			return MOCK_JIRA_TICKETS.filter((t) => !q.trim() || t.title.toLowerCase().includes(q) || (t.key && t.key.toLowerCase().includes(q))).slice(
				0,
				lim,
			);
		}
		const keys = this.cfg.jiraProjectKeys;
		const text = jqlOrText.trim();
		const jql =
			text.toUpperCase().includes('ORDER BY') || text.includes('=') || text.includes('~')
				? text
				: `text ~ "${text.replace(/"/g, '\\"')}"${keys.length ? ` AND project in (${keys.map((k) => `"${k}"`).join(',')})` : ''} ORDER BY updated DESC`;
		const url = `${this.cfg.jiraBaseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${lim}`;
		const data = await this.http.getJson<{ issues?: Array<Record<string, unknown>> }>(url, { authHeader: this.authHeader() });
		const out: TicketSummary[] = [];
		for (const issue of data.issues ?? []) {
			const key = String(issue['key'] ?? '');
			if (!this.projectAllowed(key)) continue;
			const f = issue['fields'] as Record<string, unknown> | undefined;
			const st = f?.['status'] as { name?: string } | undefined;
			const pr = f?.['priority'] as { name?: string } | undefined;
			out.push({
				id: String(issue['id'] ?? ''),
				key,
				title: String(f?.['summary'] ?? ''),
				status: st?.name,
				priority: pr?.name,
				updatedAt: String(f?.['updated'] ?? ''),
				url: `${this.cfg.jiraBaseUrl}/browse/${key}`,
			});
		}
		return out;
	}

	async getIssue(issueKey: string): Promise<TicketDetail> {
		if (this.useMock()) return mockJiraDetail(issueKey);
		if (!this.projectAllowed(issueKey)) throw new Error('project_not_allowed');
		const url = `${this.cfg.jiraBaseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
		const issue = await this.http.getJson<Record<string, unknown>>(url, { authHeader: this.authHeader() });
		const f = issue['fields'] as Record<string, unknown> | undefined;
		const st = f?.['status'] as { name?: string } | undefined;
		const pr = f?.['priority'] as { name?: string } | undefined;
		const desc = f?.['description'];
		let description = '';
		if (typeof desc === 'string') description = desc;
		return {
			id: String(issue['id'] ?? ''),
			key: String(issue['key'] ?? issueKey),
			title: String(f?.['summary'] ?? ''),
			status: st?.name,
			priority: pr?.name,
			updatedAt: String(f?.['updated'] ?? ''),
			url: `${this.cfg.jiraBaseUrl}/browse/${String(issue['key'] ?? issueKey)}`,
			description,
		};
	}

	async listRecentIssues(projectKey?: string, limit?: number): Promise<TicketSummary[]> {
		const lim = Math.min(limit ?? this.cfg.connectorMaxResults, this.cfg.connectorMaxResults);
		const pk = projectKey?.toUpperCase();
		if (this.useMock()) {
			return MOCK_JIRA_TICKETS.filter((t) => !pk || (t.key && t.key.startsWith(pk))).slice(0, lim);
		}
		const jql = pk ? `project = "${pk}" ORDER BY updated DESC` : 'updated >= -30d ORDER BY updated DESC';
		return this.searchIssues(jql, lim);
	}

	async listProjectIssues(projectKey: string, limit?: number): Promise<TicketSummary[]> {
		return this.listRecentIssues(projectKey, limit);
	}
}
