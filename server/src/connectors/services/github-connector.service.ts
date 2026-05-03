import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import type { ConnectorHealth } from '../models/connector.model';
import type {
	CommitSummary,
	PullRequestDetail,
	PullRequestSummary,
	RepositoryFileContent,
	RepositoryFileSummary,
	RepositorySearchResult,
	RepositorySummary,
} from '../models/repository-connector.model';
import { MOCK_COMMITS, MOCK_PRS, MOCK_REPO_SUMMARIES, mockRepoFile, mockRepoSearch } from './connector-mock-data';
import { ConnectorHttpService } from './connector-http.service';
import { isBlockedRepoPath } from './connector-path-guard';

@Injectable()
export class GithubConnectorService {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly http: ConnectorHttpService,
	) {}

	private tokenHeader(): string | undefined {
		const t = this.cfg.githubToken;
		return t ? `token ${t}` : undefined;
	}

	private configured(): boolean {
		return this.cfg.enableGithubConnector && !!this.cfg.githubToken;
	}

	isEnabled(): boolean {
		return this.configured() || (this.cfg.enableConnectorMockFallback && this.cfg.enableConnectors);
	}

	hasLiveApi(): boolean {
		return this.configured();
	}

	private useMock(): boolean {
		return !this.configured() && this.cfg.enableConnectorMockFallback;
	}

	private ownerRepo(full: string): { owner: string; repo: string } {
		const owner = this.cfg.githubDefaultOwner;
		if (full.includes('/')) {
			const [o, r] = full.split('/');
			return { owner: o!, repo: r! };
		}
		if (!owner) throw new Error('github_owner_required');
		return { owner, repo: full };
	}

	private allowedFullNames(): string[] {
		const raw = this.cfg.githubAllowedRepos;
		if (raw.length) return raw;
		if (this.cfg.githubDefaultOwner) {
			return MOCK_REPO_SUMMARIES.map((m) => `${this.cfg.githubDefaultOwner}/${m.slug}`);
		}
		return [];
	}

	private repoAllowed(full: string): boolean {
		const a = this.allowedFullNames();
		if (!a.length) return true;
		return a.map((x) => x.toLowerCase()).includes(full.toLowerCase());
	}

	private cap(s: string): string {
		const m = this.cfg.connectorMaxContentChars;
		return s.length <= m ? s : s.slice(0, m);
	}

	async healthCheck(): Promise<ConnectorHealth> {
		const now = new Date().toISOString();
		if (!this.cfg.enableConnectors) {
			return { connectorId: 'github', status: 'disabled', message: 'Connectors disabled', checkedAt: now };
		}
		if (!this.configured()) {
			return {
				connectorId: 'github',
				status: this.cfg.enableConnectorMockFallback ? 'enabled' : 'missing_config',
				message: this.cfg.enableConnectorMockFallback ? 'Mock fallback (GitHub not configured)' : 'Missing GITHUB_TOKEN',
				checkedAt: now,
				metadata: { mockFallback: this.cfg.enableConnectorMockFallback },
			};
		}
		try {
			await this.http.getJson<unknown>(`${this.cfg.githubBaseUrl}/user`, { authHeader: this.tokenHeader() });
			return { connectorId: 'github', status: 'healthy', message: 'GitHub API reachable', checkedAt: now };
		} catch (e) {
			return {
				connectorId: 'github',
				status: 'unhealthy',
				message: e instanceof Error ? e.message : 'error',
				checkedAt: now,
			};
		}
	}

	async listRepositories(): Promise<RepositorySummary[]> {
		if (this.useMock()) return MOCK_REPO_SUMMARIES;
		const owner = this.cfg.githubDefaultOwner;
		if (!owner) return [];
		const data = await this.http.getJson<Array<Record<string, unknown>>>(
			`${this.cfg.githubBaseUrl}/users/${encodeURIComponent(owner)}/repos?per_page=${this.cfg.connectorMaxResults}`,
			{ authHeader: this.tokenHeader() },
		);
		const out: RepositorySummary[] = [];
		for (const r of data) {
			const full = String(r['full_name'] ?? '');
			if (!this.repoAllowed(full)) continue;
			const name = String(r['name'] ?? '');
			out.push({
				id: name,
				name,
				slug: name,
				fullName: full,
				description: typeof r['description'] === 'string' ? r['description'] : undefined,
			});
		}
		return out;
	}

	async listFiles(repoFull: string, _branch = 'main', dirPath = ''): Promise<RepositoryFileSummary[]> {
		const { owner, repo } = this.ownerRepo(repoFull);
		if (!this.repoAllowed(`${owner}/${repo}`)) throw new Error('repository_not_allowed');
		if (this.useMock()) {
			return [
				{ path: `${dirPath || 'src'}/main.ts`, type: 'file', size: 400 },
				{ path: `${dirPath || 'src'}/routes.ts`, type: 'file', size: 200 },
			];
		}
		const pathPart = dirPath ? `/${dirPath.split('/').map(encodeURIComponent).join('/')}` : '';
		const data = await this.http.getJson<Array<{ path?: string; type?: string; size?: number }>>(
			`${this.cfg.githubBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${pathPart}?ref=${encodeURIComponent(_branch)}`,
			{ authHeader: this.tokenHeader() },
		);
		if (!Array.isArray(data)) return [];
		return data.map((f) => ({
			path: String(f.path ?? ''),
			type: f.type === 'dir' ? 'dir' : 'file',
			size: f.size,
		}));
	}

	async readFile(repoFull: string, filePath: string, branch = 'main'): Promise<RepositoryFileContent> {
		const { owner, repo } = this.ownerRepo(repoFull);
		if (!this.repoAllowed(`${owner}/${repo}`)) throw new Error('repository_not_allowed');
		if (isBlockedRepoPath(filePath)) throw new Error('path_blocked');
		if (this.useMock()) return mockRepoFile(repo, filePath, branch);
		const meta = await this.http.getJson<{ content?: string; encoding?: string }>(
			`${this.cfg.githubBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath
				.split('/')
				.map(encodeURIComponent)
				.join('/')}?ref=${encodeURIComponent(branch)}`,
			{ authHeader: this.tokenHeader() },
		);
		const enc = meta.encoding === 'base64' && meta.content ? Buffer.from(meta.content.replace(/\n/g, ''), 'base64').toString('utf8') : '';
		const capped = this.cap(enc);
		return {
			repoSlug: `${owner}/${repo}`,
			path: filePath,
			branch,
			content: capped,
			language: filePath.endsWith('.ts') ? 'typescript' : 'text',
			size: capped.length,
		};
	}

	async searchCode(query: string, repoFull?: string): Promise<RepositorySearchResult[]> {
		if (this.useMock()) return mockRepoSearch(query);
		let q = query;
		if (repoFull) {
			const { owner, repo } = this.ownerRepo(repoFull);
			q = `${query} repo:${owner}/${repo}`;
		}
		const data = await this.http.getJson<{ items?: Array<{ path?: string; text_matches?: Array<{ fragment?: string }> }> }>(
			`${this.cfg.githubBaseUrl}/search/code?q=${encodeURIComponent(q)}&per_page=${this.cfg.connectorMaxResults}`,
			{ authHeader: this.tokenHeader() },
		);
		const out: RepositorySearchResult[] = [];
		for (const it of data.items ?? []) {
			const path = String(it.path ?? '');
			if (isBlockedRepoPath(path)) continue;
			out.push({ path, snippet: it.text_matches?.[0]?.fragment ?? query });
		}
		return out;
	}

	async listPullRequests(repoFull: string, state = 'open'): Promise<PullRequestSummary[]> {
		const { owner, repo } = this.ownerRepo(repoFull);
		if (!this.repoAllowed(`${owner}/${repo}`)) throw new Error('repository_not_allowed');
		if (this.useMock()) return MOCK_PRS;
		const data = await this.http.getJson<Array<Record<string, unknown>>>(
			`${this.cfg.githubBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${encodeURIComponent(state)}&per_page=${this.cfg.connectorMaxResults}`,
			{ authHeader: this.tokenHeader() },
		);
		return data.map((pr) => ({
			id: String(pr['number'] ?? ''),
			title: String(pr['title'] ?? ''),
			state: String(pr['state'] ?? ''),
			author: String(((pr['user'] as { login?: string })?.login as string) ?? ''),
			sourceBranch: String(((pr['head'] as { ref?: string })?.ref as string) ?? ''),
			targetBranch: String(((pr['base'] as { ref?: string })?.ref as string) ?? 'main'),
			createdAt: String(pr['created_at'] ?? ''),
			updatedAt: String(pr['updated_at'] ?? ''),
			url: String(pr['html_url'] ?? ''),
		}));
	}

	async getPullRequest(repoFull: string, prId: string): Promise<PullRequestDetail> {
		const list = await this.listPullRequests(repoFull);
		const hit = list.find((p) => p.id === prId) ?? list[0];
		if (!hit) return { ...MOCK_PRS[0]!, body: '' };
		if (this.useMock()) return { ...hit, body: 'Mock PR body' };
		const { owner, repo } = this.ownerRepo(repoFull);
		const pr = await this.http.getJson<Record<string, unknown>>(
			`${this.cfg.githubBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(prId)}`,
			{ authHeader: this.tokenHeader() },
		);
		return {
			...hit,
			body: typeof pr['body'] === 'string' ? pr['body'] : undefined,
		};
	}

	async listRecentCommits(repoFull: string, branch = 'main'): Promise<CommitSummary[]> {
		const { owner, repo } = this.ownerRepo(repoFull);
		if (!this.repoAllowed(`${owner}/${repo}`)) throw new Error('repository_not_allowed');
		if (this.useMock()) return MOCK_COMMITS;
		const data = await this.http.getJson<Array<Record<string, unknown>>>(
			`${this.cfg.githubBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=${this.cfg.connectorMaxResults}`,
			{ authHeader: this.tokenHeader() },
		);
		return data.map((c) => ({
			hash: String((c['sha'] as string)?.slice(0, 12) ?? ''),
			message: String((c['commit'] as { message?: string })?.message?.split('\n')[0] ?? ''),
			author: String(((c['commit'] as { author?: { name?: string } })?.author?.name as string) ?? ''),
			date: String((c['commit'] as { author?: { date?: string } })?.author?.date ?? ''),
			url: String((c['html_url'] as string) ?? ''),
		}));
	}
}
