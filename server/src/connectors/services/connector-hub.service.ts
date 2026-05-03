import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { normalizedToolOutput } from '../../internal-tools/models/internal-tool.model';
import { BitbucketConnectorService } from './bitbucket-connector.service';
import { CicdConnectorService } from './cicd-connector.service';
import { ConfluenceConnectorService } from './confluence-connector.service';
import { ConnectorHealthService } from './connector-health.service';
import { ConnectorOutputNormalizerService } from './connector-output-normalizer.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { MOCK_REPO_SUMMARIES } from './connector-mock-data';
import { GithubConnectorService } from './github-connector.service';
import { JiraConnectorService } from './jira-connector.service';
import { SupportTicketConnectorService } from './support-ticket-connector.service';

/** Routes connector_* tools — read-only; returns InternalToolHub-compatible records. */
@Injectable()
export class ConnectorHubService {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly registry: ConnectorRegistryService,
		private readonly health: ConnectorHealthService,
		private readonly norm: ConnectorOutputNormalizerService,
		private readonly bitbucket: BitbucketConnectorService,
		private readonly github: GithubConnectorService,
		private readonly jira: JiraConnectorService,
		private readonly confluence: ConfluenceConnectorService,
		private readonly support: SupportTicketConnectorService,
		private readonly cicd: CicdConnectorService,
	) {}

	private asRecord(n: ReturnType<typeof normalizedToolOutput>): Record<string, unknown> {
		return { ...n };
	}

	private tagRepoMock(rec: Record<string, unknown>): Record<string, unknown> {
		if (!this.bitbucket.hasLiveApi() && !this.github.hasLiveApi()) {
			const meta = { ...((rec['metadata'] as Record<string, unknown>) ?? {}), mockFallback: true };
			return { ...rec, metadata: meta };
		}
		return rec;
	}

	private repoSource(): 'bitbucket' | 'github' {
		if (this.bitbucket.hasLiveApi()) return 'bitbucket';
		if (this.github.hasLiveApi()) return 'github';
		return 'bitbucket';
	}

	private defaultRepoSlug(): string {
		return MOCK_REPO_SUMMARIES[0]!.slug;
	}

	private normalizeGithubRepoSlug(repoSlug: string): string {
		if (repoSlug.includes('/')) return repoSlug;
		const o = this.cfg.githubDefaultOwner;
		return o ? `${o}/${repoSlug}` : repoSlug;
	}

	async executeConnectorTool(toolId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
		if (!this.cfg.enableConnectors) {
			return this.asRecord(
				normalizedToolOutput('Connectors disabled', 'Set ENABLE_CONNECTORS=true', [], '', {
					source: 'connector',
					blocked: true,
				}),
			);
		}

		switch (toolId) {
			case 'connector_list': {
				const defs = this.registry.listConnectors();
				return this.asRecord(
					normalizedToolOutput('Connector registry', `${defs.length} connector(s)`, defs, '', {
						source: 'connector',
						connectorSource: 'cicd',
					}),
				);
			}
			case 'connector_health': {
				const h = await this.health.getAllHealth();
				return this.asRecord(
					normalizedToolOutput('Connector health', `${h.length} status row(s)`, h, '', {
						source: 'connector',
						connectorSource: 'cicd',
					}),
				);
			}
			case 'connector_repo_list': {
				const src = this.repoSource();
				const rows = src === 'github' ? await this.github.listRepositories() : await this.bitbucket.listRepositories();
				return this.tagRepoMock(this.asRecord(this.norm.fromRepositories(src, rows)));
			}
			case 'connector_repo_read_file': {
				const path = String(input['path'] ?? '');
				const branch = String(input['branch'] ?? 'main');
				let repoSlug = String(input['repoSlug'] ?? '');
				if (!repoSlug) repoSlug = this.defaultRepoSlug();
				const src = this.repoSource();
				if (src === 'github') {
					const full = this.normalizeGithubRepoSlug(repoSlug);
					const file = await this.github.readFile(full, path, branch);
					return this.tagRepoMock(this.asRecord(this.norm.fromFile('github', { ...file, repoSlug: full })));
				}
				const file = await this.bitbucket.readFile(repoSlug, path, branch);
				return this.tagRepoMock(this.asRecord(this.norm.fromFile('bitbucket', file)));
			}
			case 'connector_repo_search': {
				const query = String(input['query'] ?? '');
				const repoSlug = input['repoSlug'] ? String(input['repoSlug']) : undefined;
				const src = this.repoSource();
				if (src === 'github') {
					const full = repoSlug ? this.normalizeGithubRepoSlug(repoSlug) : undefined;
					const hits = await this.github.searchCode(query, full);
					return this.tagRepoMock(this.asRecord(this.norm.fromSearch('github', hits, query)));
				}
				const hits = await this.bitbucket.searchCode(query, repoSlug);
				return this.tagRepoMock(this.asRecord(this.norm.fromSearch('bitbucket', hits, query)));
			}
			case 'connector_repo_pull_requests': {
				let repoSlug = String(input['repoSlug'] ?? '');
				if (!repoSlug) repoSlug = this.defaultRepoSlug();
				const state = String(input['state'] ?? 'OPEN');
				const src = this.repoSource();
				if (src === 'github') {
					const full = this.normalizeGithubRepoSlug(repoSlug);
					const prs = await this.github.listPullRequests(full, state.toLowerCase() === 'open' ? 'open' : state.toLowerCase());
					return this.tagRepoMock(
						this.asRecord(
							this.norm.normalizeRepositoryResult('github', 'Pull requests', `${prs.length} PR(s)`, prs, '', {
								repoSlug: full,
							}),
						),
					);
				}
				const prs = await this.bitbucket.listPullRequests(repoSlug, state);
				return this.tagRepoMock(
					this.asRecord(
						this.norm.normalizeRepositoryResult('bitbucket', 'Pull requests', `${prs.length} PR(s)`, prs, '', { repoSlug }),
					),
				);
			}
			case 'connector_repo_commits': {
				let repoSlug = String(input['repoSlug'] ?? '');
				if (!repoSlug) repoSlug = this.defaultRepoSlug();
				const branch = String(input['branch'] ?? 'main');
				const src = this.repoSource();
				if (src === 'github') {
					const full = this.normalizeGithubRepoSlug(repoSlug);
					const commits = await this.github.listRecentCommits(full, branch);
					return this.tagRepoMock(
						this.asRecord(
							this.norm.normalizeRepositoryResult('github', 'Recent commits', `${commits.length} commit(s)`, commits, '', {
								repoSlug: full,
								branch,
							}),
						),
					);
				}
				const commits = await this.bitbucket.listRecentCommits(repoSlug, branch);
				return this.tagRepoMock(
					this.asRecord(
						this.norm.normalizeRepositoryResult('bitbucket', 'Recent commits', `${commits.length} commit(s)`, commits, '', {
							repoSlug,
							branch,
						}),
					),
				);
			}
			case 'connector_jira_search': {
				const q = String(input['query'] ?? input['jql'] ?? '');
				const limit = typeof input['limit'] === 'number' ? input['limit'] : undefined;
				const rows = await this.jira.searchIssues(q, limit);
				return this.asRecord(this.norm.fromJiraTickets(rows, q));
			}
			case 'connector_jira_get_issue': {
				const key = String(input['issueKey'] ?? input['key'] ?? '');
				const issue = await this.jira.getIssue(key);
				return this.asRecord(this.norm.fromJiraIssue(issue));
			}
			case 'connector_support_search': {
				const q = String(input['query'] ?? '');
				const limit = typeof input['limit'] === 'number' ? input['limit'] : undefined;
				const rows = await this.support.searchTickets(q, limit);
				return this.asRecord(this.norm.fromSupport(rows, q));
			}
			case 'connector_support_get_ticket': {
				const id = String(input['ticketId'] ?? input['id'] ?? '');
				const t = await this.support.getTicket(id);
				return this.asRecord(this.norm.fromSupportTicket(t));
			}
			case 'connector_confluence_search': {
				const q = String(input['query'] ?? '');
				const limit = typeof input['limit'] === 'number' ? input['limit'] : undefined;
				const rows = await this.confluence.searchPages(q, limit);
				return this.asRecord(this.norm.fromConfluencePages(rows, q));
			}
			case 'connector_confluence_get_page': {
				const pageId = String(input['pageId'] ?? '');
				const page = await this.confluence.getPage(pageId);
				return this.asRecord(this.norm.fromConfluencePage(page));
			}
			case 'connector_cicd_list_files': {
				const files = await this.cicd.listPipelineFiles();
				return this.asRecord(
					normalizedToolOutput('CI/CD files', `${files.length} file(s)`, files, '', {
						source: 'connector',
						connectorSource: 'cicd',
					}),
				);
			}
			case 'connector_cicd_read_file': {
				const path = String(input['path'] ?? '');
				const body = await this.cicd.readPipelineFile(path);
				return this.asRecord(
					normalizedToolOutput(`CI/CD: ${body.path}`, `${body.size} bytes`, [], body.content, {
						source: 'connector',
						connectorSource: 'cicd',
						path: body.path,
					}),
				);
			}
			case 'connector_cicd_analyze': {
				const a = await this.cicd.analyzePipelineConfig();
				return this.asRecord(this.norm.normalizeCicdResult('CI/CD analysis', a.summary, a, {}));
			}
			default:
				return this.asRecord(
					normalizedToolOutput('Unknown connector tool', toolId, [], '', { source: 'connector', blocked: true }),
				);
		}
	}
}
