import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import type { ConnectorHealth } from '../models/connector.model';
import type { DocContent, DocSpaceSummary, DocSummary } from '../models/docs-connector.model';
import { MOCK_CONFLUENCE, mockConfluencePage } from './connector-mock-data';
import { ConnectorHttpService } from './connector-http.service';

@Injectable()
export class ConfluenceConnectorService {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly http: ConnectorHttpService,
	) {}

	private authHeader(): string | undefined {
		const e = this.cfg.confluenceEmail;
		const t = this.cfg.confluenceApiToken;
		if (!e || !t) return undefined;
		return `Basic ${Buffer.from(`${e}:${t}`, 'utf8').toString('base64')}`;
	}

	private baseWiki(): string {
		return `${this.cfg.confluenceBaseUrl}/wiki/rest/api`;
	}

	private configured(): boolean {
		return (
			this.cfg.enableConfluenceConnector && !!this.cfg.confluenceBaseUrl && !!this.cfg.confluenceEmail && !!this.cfg.confluenceApiToken
		);
	}

	isEnabled(): boolean {
		return this.configured() || (this.cfg.enableConnectorMockFallback && this.cfg.enableConnectors);
	}

	private useMock(): boolean {
		return !this.configured() && this.cfg.enableConnectorMockFallback;
	}

	private stripHtml(html: string): string {
		return html
			.replace(/<script[\s\S]*?<\/script>/gi, '')
			.replace(/<style[\s\S]*?<\/style>/gi, '')
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	private spaceAllowed(key?: string): boolean {
		const keys = this.cfg.confluenceSpaceKeys;
		if (!keys.length || !key) return true;
		return keys.includes(key.toUpperCase());
	}

	private cap(s: string): string {
		const m = this.cfg.connectorMaxContentChars;
		return s.length <= m ? s : s.slice(0, m);
	}

	async healthCheck(): Promise<ConnectorHealth> {
		const now = new Date().toISOString();
		if (!this.cfg.enableConnectors) {
			return { connectorId: 'confluence', status: 'disabled', message: 'Connectors disabled', checkedAt: now };
		}
		if (!this.configured()) {
			return {
				connectorId: 'confluence',
				status: this.cfg.enableConnectorMockFallback ? 'enabled' : 'missing_config',
				message: this.cfg.enableConnectorMockFallback ? 'Mock fallback (Confluence not configured)' : 'Missing Confluence config',
				checkedAt: now,
				metadata: { mockFallback: this.cfg.enableConnectorMockFallback },
			};
		}
		try {
			await this.http.getJson<unknown>(`${this.baseWiki()}/space?limit=1`, { authHeader: this.authHeader() });
			return { connectorId: 'confluence', status: 'healthy', message: 'Confluence API reachable', checkedAt: now };
		} catch (e) {
			return {
				connectorId: 'confluence',
				status: 'unhealthy',
				message: e instanceof Error ? e.message : 'error',
				checkedAt: now,
			};
		}
	}

	async listSpaces(): Promise<DocSpaceSummary[]> {
		if (this.useMock()) return [{ key: 'ENG', name: 'Engineering' }];
		const data = await this.http.getJson<{ results?: Array<{ key?: string; name?: string; type?: string }> }>(
			`${this.baseWiki()}/space?limit=${this.cfg.connectorMaxResults}`,
			{ authHeader: this.authHeader() },
		);
		return (data.results ?? [])
			.filter((s) => this.spaceAllowed(s.key))
			.map((s) => ({ key: String(s.key ?? ''), name: String(s.name ?? ''), type: s.type }));
	}

	async searchPages(query: string, limit?: number): Promise<DocSummary[]> {
		const lim = Math.min(limit ?? this.cfg.connectorMaxResults, this.cfg.connectorMaxResults);
		if (this.useMock()) {
			const q = query.toLowerCase();
			return MOCK_CONFLUENCE.filter((d) => !q || d.title.toLowerCase().includes(q)).slice(0, lim);
		}
		const keys = this.cfg.confluenceSpaceKeys;
		const cql =
			keys.length > 0
				? `type=page AND space in (${keys.map((k) => `"${k}"`).join(',')}) AND text ~ "${query.replace(/"/g, '\\"')}"`
				: `type=page AND text ~ "${query.replace(/"/g, '\\"')}"`;
		const url = `${this.baseWiki()}/content/search?cql=${encodeURIComponent(cql)}&limit=${lim}`;
		const data = await this.http.getJson<{ results?: Array<Record<string, unknown>> }>(url, { authHeader: this.authHeader() });
		const out: DocSummary[] = [];
		for (const r of data.results ?? []) {
			const sid = ((r['_expandable'] as Record<string, unknown> | undefined)?.['space'] as string) || '';
			const sk = typeof r['space'] === 'object' && r['space'] ? String((r['space'] as { key?: string }).key ?? '') : '';
			const spaceKey = sk || sid;
			if (!this.spaceAllowed(spaceKey)) continue;
			out.push({
				id: String(r['id'] ?? ''),
				title: String((r['title'] as string) ?? ''),
				spaceKey,
				url: `${this.cfg.confluenceBaseUrl}/wiki/spaces/${spaceKey}/pages/${r['id']}`,
				excerpt: typeof r['excerpt'] === 'string' ? r['excerpt'] : undefined,
				updatedAt: String((r['version'] as { when?: string } | undefined)?.when ?? ''),
			});
		}
		return out;
	}

	async getPage(pageId: string): Promise<DocContent> {
		if (this.useMock()) return mockConfluencePage(pageId);
		const url = `${this.baseWiki()}/content/${encodeURIComponent(pageId)}?expand=body.storage,space,version`;
		const r = await this.http.getJson<Record<string, unknown>>(url, { authHeader: this.authHeader() });
		const space = r['space'] as { key?: string } | undefined;
		if (!this.spaceAllowed(space?.key)) throw new Error('space_not_allowed');
		const body = (r['body'] as { storage?: { value?: string } } | undefined)?.storage?.value ?? '';
		const text = this.cap(this.stripHtml(body));
		return {
			id: String(r['id'] ?? pageId),
			title: String(r['title'] ?? ''),
			spaceKey: space?.key,
			url: `${this.cfg.confluenceBaseUrl}/wiki/pages/viewpage.action?pageId=${encodeURIComponent(pageId)}`,
			updatedAt: String((r['version'] as { when?: string } | undefined)?.when ?? ''),
			bodyText: text,
		};
	}

	async listRecentPages(spaceKey?: string, limit?: number): Promise<DocSummary[]> {
		const lim = Math.min(limit ?? this.cfg.connectorMaxResults, this.cfg.connectorMaxResults);
		if (this.useMock()) return MOCK_CONFLUENCE.slice(0, lim);
		const sk = spaceKey?.toUpperCase();
		if (sk && !this.spaceAllowed(sk)) return [];
		const cql = sk ? `type=page AND space = ${sk} order by lastmodified desc` : `type=page order by lastmodified desc`;
		const url = `${this.baseWiki()}/content/search?cql=${encodeURIComponent(cql)}&limit=${lim}`;
		const data = await this.http.getJson<{ results?: Array<Record<string, unknown>> }>(url, { authHeader: this.authHeader() });
		return (data.results ?? []).map((r) => ({
			id: String(r['id'] ?? ''),
			title: String(r['title'] ?? ''),
			spaceKey: String(((r['space'] as { key?: string } | undefined)?.key as string) ?? ''),
			updatedAt: String((r['version'] as { when?: string } | undefined)?.when ?? ''),
		}));
	}
}
