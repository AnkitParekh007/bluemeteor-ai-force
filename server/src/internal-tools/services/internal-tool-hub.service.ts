import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { normalizedToolOutput, type NormalizedToolOutput } from '../models/internal-tool.model';
import { ApiCatalogReaderService } from './api-catalog-reader.service';
import { CicdReaderService } from './cicd-reader.service';
import { DatabaseSchemaReaderService } from './database-schema-reader.service';
import { DocsReaderService } from './docs-reader.service';
import { RepositoryReaderService } from './repository-reader.service';
import { TicketReaderService } from './ticket-reader.service';

@Injectable()
export class InternalToolHubService {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly repo: RepositoryReaderService,
		private readonly docs: DocsReaderService,
		private readonly tickets: TicketReaderService,
		private readonly api: ApiCatalogReaderService,
		private readonly schema: DatabaseSchemaReaderService,
		private readonly cicd: CicdReaderService,
	) {}

	private asRecord(n: NormalizedToolOutput): Record<string, unknown> {
		return { ...n };
	}

	private blocked(toolId: string, reason: string): Record<string, unknown> {
		return this.asRecord(
			normalizedToolOutput(`Blocked: ${toolId}`, reason, [], '', { blocked: true, toolId }),
		);
	}

	/**
	 * Routes read-only internal tools. Returns a flat record compatible with ToolExecutor storage / UI.
	 */
	async executeReadOnlyTool(toolId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
		if (!this.cfg.enableInternalTools) {
			return this.blocked(toolId, 'internal_tools_disabled');
		}

		switch (toolId) {
			case 'repository_overview': {
				if (!this.cfg.enableRepositoryReader) return this.blocked(toolId, 'repository_reader_disabled');
				const o = await this.repo.getRepositoryOverview();
				return this.asRecord(
					normalizedToolOutput('Repository overview', `Project: ${o.projectType}`, [o], JSON.stringify(o, null, 2), {
						source: 'repository',
					}),
				);
			}
			case 'repository_list_files': {
				if (!this.cfg.enableRepositoryReader) return this.blocked(toolId, 'repository_reader_disabled');
				const q = typeof input['query'] === 'string' ? input['query'] : undefined;
				const files = await this.repo.listRepositoryFiles(q);
				return this.asRecord(
					normalizedToolOutput(
						'Repository files',
						`${files.length} file(s)`,
						files,
						'',
						{ source: 'repository' },
					),
				);
			}
			case 'repository_read_file': {
				if (!this.cfg.enableRepositoryReader) return this.blocked(toolId, 'repository_reader_disabled');
				const p = String(input['path'] ?? '');
				const body = await this.repo.readRepositoryFile(p);
				return this.asRecord(
					normalizedToolOutput(
						`File: ${body.path}`,
						`${body.language} · ${body.size} bytes`,
						[],
						body.content.slice(0, 50_000),
						{ source: 'repository', path: body.path, language: body.language },
					),
				);
			}
			case 'repository_search_text': {
				if (!this.cfg.enableRepositoryReader) return this.blocked(toolId, 'repository_reader_disabled');
				const q = String(input['query'] ?? '');
				const limit = typeof input['limit'] === 'number' ? input['limit'] : 30;
				const hits = await this.repo.searchRepositoryText(q, limit);
				return this.asRecord(
					normalizedToolOutput('Repository search', `${hits.length} hit(s)`, hits, '', {
						source: 'repository',
						query: q,
					}),
				);
			}
			case 'docs_list': {
				if (!this.cfg.enableDocsReader) return this.blocked(toolId, 'docs_reader_disabled');
				const list = await this.docs.listDocs();
				return this.asRecord(
					normalizedToolOutput('Documentation index', `${list.length} doc(s)`, list, '', { source: 'docs' }),
				);
			}
			case 'docs_read': {
				if (!this.cfg.enableDocsReader) return this.blocked(toolId, 'docs_reader_disabled');
				const p = String(input['path'] ?? '');
				const doc = await this.docs.readDoc(p);
				return this.asRecord(
					normalizedToolOutput(`Doc: ${doc.path}`, `${doc.content.length} chars`, [], doc.content.slice(0, 50_000), {
						source: 'docs',
						path: doc.path,
					}),
				);
			}
			case 'docs_search': {
				if (!this.cfg.enableDocsReader) return this.blocked(toolId, 'docs_reader_disabled');
				const q = String(input['query'] ?? '');
				const limit = typeof input['limit'] === 'number' ? input['limit'] : 40;
				const hits = await this.docs.searchDocs(q, limit);
				return this.asRecord(
					normalizedToolOutput('Docs search', `${hits.length} hit(s)`, hits, '', { source: 'docs', query: q }),
				);
			}
			case 'tickets_list': {
				if (!this.cfg.enableTicketReader) return this.blocked(toolId, 'ticket_reader_disabled');
				const filter =
					typeof input['status'] === 'string'
						? { status: input['status'] as 'open' | 'in_progress' | 'resolved' | 'closed' }
						: undefined;
				const list = await this.tickets.listTickets(filter);
				return this.asRecord(
					normalizedToolOutput('Tickets', `${list.length} ticket(s)`, list, '', { source: 'tickets' }),
				);
			}
			case 'tickets_get': {
				if (!this.cfg.enableTicketReader) return this.blocked(toolId, 'ticket_reader_disabled');
				const id = String(input['ticketId'] ?? input['id'] ?? '');
				const t = await this.tickets.getTicket(id);
				if (!t) return this.blocked(toolId, `ticket_not_found:${id}`);
				return this.asRecord(
					normalizedToolOutput(t.title, t.description.slice(0, 400), [t], t.description, {
						source: 'tickets',
						ticketId: t.id,
					}),
				);
			}
			case 'tickets_search': {
				if (!this.cfg.enableTicketReader) return this.blocked(toolId, 'ticket_reader_disabled');
				const q = String(input['query'] ?? '');
				const limit = typeof input['limit'] === 'number' ? input['limit'] : 20;
				const list = await this.tickets.searchTickets(q, limit);
				return this.asRecord(
					normalizedToolOutput('Ticket search', `${list.length} match(es)`, list, '', {
						source: 'tickets',
						query: q,
					}),
				);
			}
			case 'api_catalog_list': {
				if (!this.cfg.enableApiCatalogReader) return this.blocked(toolId, 'api_catalog_disabled');
				const list = await this.api.listApis();
				return this.asRecord(
					normalizedToolOutput('API catalog', `${list.length} endpoint(s)`, list, '', { source: 'api_catalog' }),
				);
			}
			case 'api_catalog_get': {
				if (!this.cfg.enableApiCatalogReader) return this.blocked(toolId, 'api_catalog_disabled');
				const id = String(input['endpointId'] ?? input['id'] ?? '');
				const e = await this.api.getApi(id);
				if (!e) return this.blocked(toolId, `endpoint_not_found:${id}`);
				return this.asRecord(
					normalizedToolOutput(`${e.method} ${e.path}`, e.summary, [e], JSON.stringify(e, null, 2), {
						source: 'api_catalog',
						endpointId: e.id,
					}),
				);
			}
			case 'api_catalog_search': {
				if (!this.cfg.enableApiCatalogReader) return this.blocked(toolId, 'api_catalog_disabled');
				const q = String(input['query'] ?? '');
				const limit = typeof input['limit'] === 'number' ? input['limit'] : 25;
				const list = await this.api.searchApis(q, limit);
				return this.asRecord(
					normalizedToolOutput('API search', `${list.length} match(es)`, list, '', {
						source: 'api_catalog',
						query: q,
					}),
				);
			}
			case 'db_schema_overview': {
				if (!this.cfg.enableDatabaseSchemaReader) return this.blocked(toolId, 'db_schema_disabled');
				const o = await this.schema.getSchemaOverview();
				return this.asRecord(
					normalizedToolOutput(o.title, `${o.tables.length} tables documented`, [o], o.tables.join('\n'), {
						source: 'database_schema',
					}),
				);
			}
			case 'db_schema_get_table': {
				if (!this.cfg.enableDatabaseSchemaReader) return this.blocked(toolId, 'db_schema_disabled');
				const name = String(input['tableName'] ?? input['name'] ?? '');
				const t = await this.schema.getTable(name);
				if (!t) return this.blocked(toolId, `table_not_found:${name}`);
				return this.asRecord(
					normalizedToolOutput(`Table ${t.name}`, 'Schema fragment (documentation only)', [], t.content, {
						source: 'database_schema',
						table: t.name,
					}),
				);
			}
			case 'db_schema_search': {
				if (!this.cfg.enableDatabaseSchemaReader) return this.blocked(toolId, 'db_schema_disabled');
				const q = String(input['query'] ?? '');
				const limit = typeof input['limit'] === 'number' ? input['limit'] : 40;
				const hits = await this.schema.searchSchema(q, limit);
				return this.asRecord(
					normalizedToolOutput('Schema search', `${hits.length} hit(s)`, hits, '', {
						source: 'database_schema',
						query: q,
					}),
				);
			}
			case 'cicd_list_files': {
				if (!this.cfg.enableCicdReader) return this.blocked(toolId, 'cicd_reader_disabled');
				const files = await this.cicd.listCicdFiles();
				return this.asRecord(
					normalizedToolOutput('CI/CD files', `${files.length} path(s)`, files, '', { source: 'cicd' }),
				);
			}
			case 'cicd_read_file': {
				if (!this.cfg.enableCicdReader) return this.blocked(toolId, 'cicd_reader_disabled');
				const p = String(input['path'] ?? '');
				const body = await this.cicd.readCicdFile(p);
				return this.asRecord(
					normalizedToolOutput(`CI/CD: ${body.path}`, `${body.size} bytes`, [], body.content.slice(0, 50_000), {
						source: 'cicd',
						path: body.path,
					}),
				);
			}
			case 'cicd_analyze': {
				if (!this.cfg.enableCicdReader) return this.blocked(toolId, 'cicd_reader_disabled');
				const a = await this.cicd.analyzeCicdConfig();
				return this.asRecord(
					normalizedToolOutput('CI/CD analysis', a.summary, [a], JSON.stringify(a, null, 2), { source: 'cicd' }),
				);
			}
			default:
				return this.blocked(toolId, 'unknown_internal_tool');
		}
	}
}
