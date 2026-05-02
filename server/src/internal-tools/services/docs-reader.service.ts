import * as path from 'node:path';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { listFilesSafe, readTextFileSafe, resolveSafePath } from '../../common/utils/safe-file-reader';
import type { DocContent, DocSearchResult, DocSummary } from '../models/docs-tool.model';

@Injectable()
export class DocsReaderService {
	constructor(private readonly cfg: AppConfigService) {}

	private docAllowedPrefixes(): string[] {
		const docs = this.cfg.docsRootRelative.replace(/^[/\\]+/, '');
		return [docs, 'README.md', 'server/README.md'].filter(Boolean);
	}

	async listDocs(): Promise<DocSummary[]> {
		if (!this.cfg.enableDocsReader) return [];
		const root = this.cfg.repositoryRootAbs;
		const allowed = this.docAllowedPrefixes();
		const files = await listFilesSafe(root, allowed, {
			maxDepth: 8,
			maxFiles: 500,
			maxFileBytes: this.cfg.maxToolFileReadBytes,
		});
		return files.map((f) => ({
			path: f.path,
			title: f.name,
			size: f.size,
		}));
	}

	async readDoc(relPath: string): Promise<DocContent> {
		if (!this.cfg.enableDocsReader) throw new Error('docs_reader_disabled');
		const root = this.cfg.repositoryRootAbs;
		const allowed = this.docAllowedPrefixes();
		const abs = resolveSafePath(root, relPath, allowed);
		const content = await readTextFileSafe(abs, this.cfg.maxToolFileReadBytes);
		return { path: relPath.replace(/\\/g, '/'), content };
	}

	async searchDocs(searchQuery: string, limit = 40): Promise<DocSearchResult[]> {
		if (!this.cfg.enableDocsReader) return [];
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		const docs = await this.listDocs();
		const out: DocSearchResult[] = [];
		for (const d of docs) {
			if (out.length >= limit) break;
			try {
				const { content } = await this.readDoc(d.path);
				const lines = content.split(/\r?\n/);
				lines.forEach((line, i) => {
					if (out.length >= limit) return;
					if (line.toLowerCase().includes(q)) {
						out.push({ path: d.path, lineNumber: i + 1, preview: line.slice(0, 220) });
					}
				});
			} catch {
				/* skip */
			}
		}
		return out;
	}
}
