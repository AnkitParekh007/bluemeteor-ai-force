import { Injectable } from '@nestjs/common';

import { normalizedToolOutput, type NormalizedToolOutput } from '../../internal-tools/models/internal-tool.model';
import type { CicdAnalysis } from '../models/cicd-connector.model';
import type { DocContent, DocSummary } from '../models/docs-connector.model';
import type { RepositoryFileContent, RepositorySearchResult, RepositorySummary } from '../models/repository-connector.model';
import type { TicketDetail, TicketSummary } from '../models/ticket-connector.model';

export interface ConnectorProviderContextShape {
	readonly sourceType: 'bitbucket' | 'github' | 'jira' | 'confluence' | 'support' | 'cicd';
	readonly title: string;
	readonly summary: string;
	readonly references: Array<{ label: string; url?: string; id?: string }>;
	readonly contentPreview: string;
	readonly metadata: Record<string, unknown>;
}

@Injectable()
export class ConnectorOutputNormalizerService {
	normalizeRepositoryResult(
		source: 'bitbucket' | 'github',
		title: string,
		summary: string,
		items: unknown[],
		content: string,
		meta: Record<string, unknown>,
	): NormalizedToolOutput {
		return normalizedToolOutput(title, summary, items, content, { ...meta, source: 'connector', connectorSource: source });
	}

	normalizeTicketResult(
		source: 'jira' | 'support',
		title: string,
		summary: string,
		items: unknown[],
		content: string,
		meta: Record<string, unknown>,
	): NormalizedToolOutput {
		return normalizedToolOutput(title, summary, items, content, { ...meta, source: 'connector', connectorSource: source });
	}

	normalizeDocsResult(
		title: string,
		summary: string,
		items: unknown[],
		content: string,
		meta: Record<string, unknown>,
	): NormalizedToolOutput {
		return normalizedToolOutput(title, summary, items, content, { ...meta, source: 'connector', connectorSource: 'confluence' });
	}

	normalizeCicdResult(title: string, summary: string, analysis: CicdAnalysis, meta: Record<string, unknown>): NormalizedToolOutput {
		const content = [analysis.summary, ...analysis.findings, ...analysis.riskHints].join('\n');
		return normalizedToolOutput(title, summary, [analysis], content, { ...meta, source: 'connector', connectorSource: 'cicd' });
	}

	summarizeForProvider(toolId: string, n: NormalizedToolOutput): ConnectorProviderContextShape {
		const meta = n.metadata ?? {};
		const st = (meta['connectorSource'] as ConnectorProviderContextShape['sourceType']) ?? 'cicd';
		const refs: ConnectorProviderContextShape['references'] = [];
		for (const it of n.items ?? []) {
			if (it && typeof it === 'object') {
				const o = it as Record<string, unknown>;
				if (typeof o['url'] === 'string') refs.push({ label: String(o['title'] ?? o['key'] ?? 'ref'), url: o['url'] });
				else if (typeof o['key'] === 'string') refs.push({ label: String(o['title'] ?? o['key']), id: o['key'] as string });
				else if (typeof o['path'] === 'string') refs.push({ label: String(o['path']), id: String(o['path']) });
			}
		}
		return {
			sourceType: st,
			title: n.title,
			summary: n.summary,
			references: refs.slice(0, 12),
			contentPreview: (n.content ?? '').slice(0, 4000),
			metadata: { toolId, ...meta },
		};
	}

	fromRepositories(source: 'bitbucket' | 'github', repos: RepositorySummary[]): NormalizedToolOutput {
		return this.normalizeRepositoryResult(
			source,
			'Repositories',
			`${repos.length} repository(ies)`,
			repos,
			'',
			{ mockFallback: repos[0]?.fullName?.includes('acme/') },
		);
	}

	fromSearch(source: 'bitbucket' | 'github', hits: RepositorySearchResult[], query: string): NormalizedToolOutput {
		return this.normalizeRepositoryResult(
			source,
			'Code search',
			`${hits.length} hit(s) for "${query.slice(0, 80)}"`,
			hits,
			'',
			{ query },
		);
	}

	fromFile(source: 'bitbucket' | 'github', file: RepositoryFileContent): NormalizedToolOutput {
		return this.normalizeRepositoryResult(
			source,
			`File: ${file.path}`,
			`${file.repoSlug} @ ${file.branch} · ${file.size} bytes`,
			[],
			file.content,
			{ repoSlug: file.repoSlug, branch: file.branch, path: file.path },
		);
	}

	fromJiraTickets(rows: TicketSummary[], query: string): NormalizedToolOutput {
		return this.normalizeTicketResult('jira', 'Jira issues', `${rows.length} issue(s)`, rows, '', { query });
	}

	fromJiraIssue(issue: TicketDetail): NormalizedToolOutput {
		return this.normalizeTicketResult('jira', issue.key ?? issue.id, issue.title, [issue], issue.description ?? '', {
			key: issue.key,
		});
	}

	fromSupport(rows: TicketSummary[], query: string): NormalizedToolOutput {
		return this.normalizeTicketResult('support', 'Support tickets', `${rows.length} ticket(s)`, rows, '', { query });
	}

	fromSupportTicket(t: TicketDetail): NormalizedToolOutput {
		return this.normalizeTicketResult('support', t.key ?? t.id, t.title, [t], t.description ?? '', {});
	}

	fromConfluencePages(rows: DocSummary[], query: string): NormalizedToolOutput {
		return this.normalizeDocsResult('Confluence pages', `${rows.length} page(s) for "${query.slice(0, 80)}"`, rows, '', {
			query,
		});
	}

	fromConfluencePage(page: DocContent): NormalizedToolOutput {
		return this.normalizeDocsResult(page.title, page.spaceKey ?? '', [page], page.bodyText, { pageId: page.id });
	}
}
