import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import type { ConnectorHealth } from '../models/connector.model';
import type {
	BranchSummary,
	CommitSummary,
	PullRequestDetail,
	PullRequestSummary,
	RepositoryDetail,
	RepositoryFileContent,
	RepositoryFileSummary,
	RepositorySearchResult,
	RepositorySummary,
} from '../models/repository-connector.model';
import {
	MOCK_COMMITS,
	MOCK_PRS,
	MOCK_REPO_SUMMARIES,
	mockRepoFile,
	mockRepoSearch,
} from './connector-mock-data';
import { ConnectorHttpService } from './connector-http.service';
import { isBlockedRepoPath } from './connector-path-guard';

@Injectable()
export class BitbucketConnectorService {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly http: ConnectorHttpService,
	) {}

	private basicAuth(): string | undefined {
		const u = this.cfg.bitbucketUsername;
		const p = this.cfg.bitbucketAppPassword;
		if (!u || !p) return undefined;
		return `Basic ${Buffer.from(`${u}:${p}`, 'utf8').toString('base64')}`;
	}

	private configured(): boolean {
		return (
			this.cfg.enableBitbucketConnector &&
			!!this.cfg.bitbucketWorkspace &&
			!!this.cfg.bitbucketUsername &&
			!!this.cfg.bitbucketAppPassword
		);
	}

	isEnabled(): boolean {
		return this.configured() || (this.cfg.enableConnectorMockFallback && this.cfg.enableConnectors);
	}

	/** True when live Bitbucket API calls should be used (not mock). */
	hasLiveApi(): boolean {
		return this.configured();
	}

	private useMock(): boolean {
		return !this.configured() && this.cfg.enableConnectorMockFallback;
	}

	private allowedSlugs(): string[] {
		const raw = this.cfg.bitbucketAllowedRepos;
		if (raw.length) return raw.map((r) => (r.includes('/') ? r.split('/').pop()! : r).trim()).filter(Boolean);
		if (this.cfg.bitbucketDefaultRepo) return [this.cfg.bitbucketDefaultRepo.trim()];
		return [];
	}

	private repoAllowed(slug: string): boolean {
		const a = this.allowedSlugs();
		if (!a.length) return true;
		return a.includes(slug);
	}

	private cap(s: string): string {
		const m = this.cfg.connectorMaxContentChars;
		return s.length <= m ? s : s.slice(0, m);
	}

	async healthCheck(): Promise<ConnectorHealth> {
		const now = new Date().toISOString();
		if (!this.cfg.enableConnectors) {
			return { connectorId: 'bitbucket', status: 'disabled', message: 'Connectors disabled', checkedAt: now };
		}
		if (!this.configured()) {
			return {
				connectorId: 'bitbucket',
				status: this.cfg.enableConnectorMockFallback ? 'enabled' : 'missing_config',
				message: this.cfg.enableConnectorMockFallback ? 'Using mock fallback (Bitbucket not configured)' : 'Missing Bitbucket credentials',
				checkedAt: now,
				metadata: { mockFallback: this.cfg.enableConnectorMockFallback },
			};
		}
		const auth = this.basicAuth();
		try {
			await this.http.getJson<{ username?: string }>(`${this.cfg.bitbucketBaseUrl}/user`, { authHeader: auth });
			return { connectorId: 'bitbucket', status: 'healthy', message: 'Bitbucket API reachable', checkedAt: now };
		} catch (e) {
			return {
				connectorId: 'bitbucket',
				status: 'unhealthy',
				message: e instanceof Error ? e.message : 'error',
				checkedAt: now,
			};
		}
	}

	async listRepositories(): Promise<RepositorySummary[]> {
		if (this.useMock()) return MOCK_REPO_SUMMARIES;
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const data = await this.http.getJson<{ values?: Array<Record<string, unknown>> }>(
			`${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}?pagelen=${this.cfg.connectorMaxResults}`,
			{ authHeader: auth },
		);
		const out: RepositorySummary[] = [];
		for (const v of data.values ?? []) {
			const slug = String(v['slug'] ?? '');
			if (!slug || !this.repoAllowed(slug)) continue;
			const links = v['links'] as Record<string, unknown> | undefined;
			out.push({
				id: slug,
				name: String(v['name'] ?? slug),
				slug,
				fullName: `${ws}/${slug}`,
				description: typeof v['description'] === 'string' ? v['description'] : undefined,
				project: v['project'] && typeof v['project'] === 'object' ? String((v['project'] as { name?: string }).name ?? '') : undefined,
				links,
			});
		}
		return out;
	}

	async getRepository(repoSlug: string): Promise<RepositoryDetail> {
		if (!this.repoAllowed(repoSlug)) throw new Error('repository_not_allowed');
		if (this.useMock()) {
			const s = MOCK_REPO_SUMMARIES.find((x) => x.slug === repoSlug) ?? MOCK_REPO_SUMMARIES[0]!;
			return { ...s, isPrivate: false, mainbranch: 'main' };
		}
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const v = await this.http.getJson<Record<string, unknown>>(
			`${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(repoSlug)}`,
			{ authHeader: auth },
		);
		const slug = String(v['slug'] ?? repoSlug);
		return {
			id: slug,
			name: String(v['name'] ?? slug),
			slug,
			fullName: `${ws}/${slug}`,
			description: typeof v['description'] === 'string' ? v['description'] : undefined,
			isPrivate: v['is_private'] === true,
			mainbranch: v['mainbranch'] && typeof v['mainbranch'] === 'object' ? String((v['mainbranch'] as { name?: string }).name ?? 'main') : 'main',
		};
	}

	async listBranches(repoSlug: string): Promise<BranchSummary[]> {
		if (!this.repoAllowed(repoSlug)) throw new Error('repository_not_allowed');
		if (this.useMock()) return [{ name: 'main' }, { name: 'develop' }];
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const data = await this.http.getJson<{ values?: Array<{ name?: string }> }>(
			`${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(repoSlug)}/refs/branches?pagelen=50`,
			{ authHeader: auth },
		);
		return (data.values ?? []).map((b) => ({ name: String(b.name ?? '') })).filter((b) => b.name);
	}

	async listFiles(repoSlug: string, branch = 'main', dirPath = ''): Promise<RepositoryFileSummary[]> {
		if (!this.repoAllowed(repoSlug)) throw new Error('repository_not_allowed');
		if (this.useMock()) {
			return [
				{ path: `${dirPath || 'src'}/app/supplier-upload/supplier-upload.component.ts`, type: 'file', size: 2400 },
				{ path: `${dirPath || 'src'}/app/app.routes.ts`, type: 'file', size: 900 },
			];
		}
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const pathSeg = dirPath ? `${encodeURIComponent(dirPath)}` : '';
		const url = `${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(repoSlug)}/src/${encodeURIComponent(branch)}/${pathSeg}`;
		const data = await this.http.getJson<{ values?: Array<{ path: string; type: string; size?: number }> }>(url, { authHeader: auth });
		return (data.values ?? []).map((f) => ({
			path: f.path,
			type: f.type === 'commit_directory' ? 'dir' : 'file',
			size: f.size,
		}));
	}

	async readFile(repoSlug: string, filePath: string, branch = 'main'): Promise<RepositoryFileContent> {
		if (!this.repoAllowed(repoSlug)) throw new Error('repository_not_allowed');
		if (isBlockedRepoPath(filePath)) throw new Error('path_blocked');
		if (this.useMock()) return mockRepoFile(repoSlug, filePath, branch);
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const url = `${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(repoSlug)}/src/${encodeURIComponent(branch)}/${filePath
			.split('/')
			.map(encodeURIComponent)
			.join('/')}`;
		const text = await this.http.getText(url, { authHeader: auth });
		const capped = this.cap(text);
		return {
			repoSlug,
			path: filePath,
			branch,
			content: capped,
			language: filePath.endsWith('.ts') ? 'typescript' : 'text',
			size: capped.length,
		};
	}

	async searchCode(query: string, repoSlug?: string): Promise<RepositorySearchResult[]> {
		if (this.useMock()) return mockRepoSearch(query);
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const slug = repoSlug && this.repoAllowed(repoSlug) ? repoSlug : this.allowedSlugs()[0] ?? (await this.listRepositories())[0]?.slug;
		if (!slug) return [];
		const q = encodeURIComponent(query);
		const url = `${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(slug)}/search/code?search_term=${q}`;
		const data = await this.http.getJson<{ search_results?: Array<{ path?: { to_string?: string }; content_match?: { lines?: Array<{ line?: number }> } }> }>(
			url,
			{ authHeader: auth },
		);
		const lim = this.cfg.connectorMaxResults;
		const out: RepositorySearchResult[] = [];
		for (const r of data.search_results ?? []) {
			if (out.length >= lim) break;
			const path = r.path?.to_string ?? '';
			if (isBlockedRepoPath(path)) continue;
			const line = r.content_match?.lines?.[0]?.line;
			out.push({ path, line, snippet: query });
		}
		return out;
	}

	async listPullRequests(repoSlug: string, state = 'OPEN'): Promise<PullRequestSummary[]> {
		if (!this.repoAllowed(repoSlug)) throw new Error('repository_not_allowed');
		if (this.useMock()) return MOCK_PRS;
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const data = await this.http.getJson<{ values?: Array<Record<string, unknown>> }>(
			`${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(repoSlug)}/pullrequests?state=${encodeURIComponent(state)}&pagelen=${this.cfg.connectorMaxResults}`,
			{ authHeader: auth },
		);
		return (data.values ?? []).map((pr) => this.mapPr(ws, repoSlug, pr));
	}

	async getPullRequest(repoSlug: string, prId: string): Promise<PullRequestDetail> {
		if (!this.repoAllowed(repoSlug)) throw new Error('repository_not_allowed');
		if (this.useMock()) return { ...MOCK_PRS[0]!, body: 'Mock PR body' };
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const pr = await this.http.getJson<Record<string, unknown>>(
			`${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(repoSlug)}/pullrequests/${encodeURIComponent(prId)}`,
			{ authHeader: auth },
		);
		return { ...this.mapPr(ws, repoSlug, pr), body: typeof pr['description'] === 'string' ? pr['description'] : undefined };
	}

	private mapPr(ws: string, repoSlug: string, pr: Record<string, unknown>): PullRequestSummary {
		const authorObj = pr['author'] as { display_name?: string } | undefined;
		const src = pr['source'] as { branch?: { name?: string } } | undefined;
		const dst = pr['destination'] as { branch?: { name?: string } } | undefined;
		const links = pr['links'] as { html?: { href?: string } } | undefined;
		return {
			id: String(pr['id'] ?? ''),
			title: String(pr['title'] ?? ''),
			state: String(pr['state'] ?? ''),
			author: authorObj?.display_name ?? 'unknown',
			sourceBranch: src?.branch?.name ?? '',
			targetBranch: dst?.branch?.name ?? 'main',
			createdAt: String(pr['created_on'] ?? new Date().toISOString()),
			updatedAt: String(pr['updated_on'] ?? new Date().toISOString()),
			url: links?.html?.href ?? `https://bitbucket.org/${ws}/${repoSlug}/pull-requests/${pr['id']}`,
		};
	}

	async listRecentCommits(repoSlug: string, branch = 'main'): Promise<CommitSummary[]> {
		if (!this.repoAllowed(repoSlug)) throw new Error('repository_not_allowed');
		if (this.useMock()) return MOCK_COMMITS;
		const ws = this.cfg.bitbucketWorkspace;
		const auth = this.basicAuth()!;
		const data = await this.http.getJson<{ values?: Array<Record<string, unknown>> }>(
			`${this.cfg.bitbucketBaseUrl}/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(repoSlug)}/commits/${encodeURIComponent(branch)}?pagelen=${this.cfg.connectorMaxResults}`,
			{ authHeader: auth },
		);
		return (data.values ?? []).map((c) => ({
			hash: String((c['hash'] as string)?.slice(0, 12) ?? ''),
			message: String((c['message'] as string)?.split('\n')[0] ?? ''),
			author: String(((c['author'] as { user?: { display_name?: string } })?.user?.display_name as string) ?? ''),
			date: String(c['date'] ?? ''),
			url: typeof (c['links'] as { html?: { href?: string } })?.html?.href === 'string' ? (c['links'] as { html: { href: string } }).html.href : undefined,
		}));
	}
}
