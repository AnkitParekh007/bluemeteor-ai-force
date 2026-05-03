import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { readTextFileSafe, resolveSafePath } from '../../common/utils/safe-file-reader';
import type { DatabaseSchemaOverview, SchemaSearchResult, TableSchemaDetail } from '../models/database-schema-tool.model';

@Injectable()
export class DatabaseSchemaReaderService {
	private readonly log = new Logger(DatabaseSchemaReaderService.name);
	private contentCache: string | null = null;

	constructor(private readonly cfg: AppConfigService) {}

	private async content(): Promise<string> {
		if (this.contentCache !== null) return this.contentCache;
		if (!this.cfg.enableDatabaseSchemaReader) {
			this.contentCache = '';
			return this.contentCache;
		}
		try {
			const rel = this.cfg.databaseSchemaPathRelative;
			const abs = resolveSafePath(this.cfg.repositoryRootAbs, rel, this.cfg.repositoryAllowedPaths);
			this.contentCache = await readTextFileSafe(abs, this.cfg.maxToolFileReadBytes);
		} catch (e) {
			this.log.warn(`schema doc load failed: ${e instanceof Error ? e.message : e}`);
			this.contentCache = '';
		}
		return this.contentCache;
	}

	async getSchemaOverview(): Promise<DatabaseSchemaOverview> {
		const md = await this.content();
		const tables: string[] = [];
		const notes: string[] = [];
		for (const line of md.split(/\r?\n/)) {
			const m = /^##\s+Table:\s*`?([a-z0-9_]+)`?/i.exec(line.trim());
			if (m) tables.push(m[1]);
			if (line.trim().startsWith('>')) notes.push(line.trim().replace(/^>\s*/, '').slice(0, 200));
		}
		return {
			title: 'Database schema (documentation)',
			tables,
			notes: notes.slice(0, 12),
		};
	}

	async searchSchema(query: string, limit = 40): Promise<SchemaSearchResult[]> {
		const q = query.trim().toLowerCase();
		const md = await this.content();
		if (!q) return [];
		const out: SchemaSearchResult[] = [];
		const lines = md.split(/\r?\n/);
		lines.forEach((line, i) => {
			if (out.length >= limit) return;
			if (line.toLowerCase().includes(q)) {
				out.push({ fragment: 'line', lineNumber: i + 1, preview: line.slice(0, 220) });
			}
		});
		return out;
	}

	async getTable(tableName: string): Promise<TableSchemaDetail | undefined> {
		const md = await this.content();
		const name = tableName.trim().toLowerCase();
		if (!name) return undefined;
		const re = new RegExp(`##\\s+Table:\\s*\`${name}\`([\\s\\S]*?)(?=##\\s+Table:|$)`, 'i');
		const m = re.exec(md);
		if (!m) return undefined;
		return { name: tableName, content: m[1].trim().slice(0, 12000) };
	}
}
