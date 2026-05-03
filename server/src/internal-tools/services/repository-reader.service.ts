import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { listFilesSafe, readTextFileSafe, resolveSafePath } from '../../common/utils/safe-file-reader';
import type {
	FileSummary,
	RepositoryFileContent,
	RepositoryOverview,
	RepositorySearchResult,
} from '../models/repository-tool.model';

@Injectable()
export class RepositoryReaderService {
	constructor(private readonly cfg: AppConfigService) {}

	private root(): string {
		return this.cfg.repositoryRootAbs;
	}

	private allowed(): string[] {
		return this.cfg.repositoryAllowedPaths;
	}

	async listRepositoryFiles(query?: string): Promise<FileSummary[]> {
		if (!this.cfg.enableRepositoryReader) return [];
		const max = this.cfg.maxToolFileReadBytes;
		const all = await listFilesSafe(this.root(), this.allowed(), {
			maxDepth: 12,
			maxFiles: 4000,
			maxFileBytes: max,
		});
		const q = query?.trim().toLowerCase();
		const mapped: FileSummary[] = all.map((f) => ({
			path: f.path,
			name: f.name,
			extension: f.extension,
			size: f.size,
			modifiedAt: f.modifiedAt,
		}));
		if (!q) return mapped.slice(0, 500);
		return mapped.filter((f) => f.path.toLowerCase().includes(q)).slice(0, 200);
	}

	async readRepositoryFile(relPath: string): Promise<RepositoryFileContent> {
		if (!this.cfg.enableRepositoryReader) {
			throw new Error('repository_reader_disabled');
		}
		const abs = resolveSafePath(this.root(), relPath, this.allowed());
		const content = await readTextFileSafe(abs, this.cfg.maxToolFileReadBytes);
		const ext = path.extname(relPath).toLowerCase();
		const lang =
			ext === '.ts'
				? 'typescript'
				: ext === '.html'
					? 'html'
					: ext === '.json'
						? 'json'
						: ext === '.md'
							? 'markdown'
							: 'text';
		return {
			path: relPath.replace(/\\/g, '/'),
			content,
			language: lang,
			size: Buffer.byteLength(content, 'utf8'),
		};
	}

	async searchRepositoryText(searchQuery: string, limit = 30): Promise<RepositorySearchResult[]> {
		if (!this.cfg.enableRepositoryReader) return [];
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		const files = await this.listRepositoryFiles();
		const out: RepositorySearchResult[] = [];
		const maxFiles = 80;
		for (const f of files.slice(0, maxFiles)) {
			if (out.length >= limit) break;
			try {
				const text = (await this.readRepositoryFile(f.path)).content;
				const lines = text.split(/\r?\n/);
				lines.forEach((line, i) => {
					if (out.length >= limit) return;
					if (line.toLowerCase().includes(q)) {
						out.push({
							path: f.path,
							lineNumber: i + 1,
							preview: line.slice(0, 240),
							score: 1,
						});
					}
				});
			} catch {
				/* skip binary or blocked */
			}
		}
		return out;
	}

	async getRepositoryOverview(): Promise<RepositoryOverview> {
		if (!this.cfg.enableRepositoryReader) {
			return {
				projectType: 'unknown',
				angularProjects: [],
				serverModules: [],
				docsAvailable: false,
				importantFiles: [],
			};
		}
		const root = this.root();
		const importantFiles: string[] = [];
		let packageJsonSummary: Record<string, unknown> | undefined;
		const angularProjects: string[] = [];
		try {
			const pjPath = resolveSafePath(root, 'package.json', this.allowed());
			const raw = await readTextFileSafe(pjPath, this.cfg.maxToolFileReadBytes);
			packageJsonSummary = JSON.parse(raw) as Record<string, unknown>;
			importantFiles.push('package.json');
		} catch {
			/* optional */
		}
		try {
			resolveSafePath(root, 'angular.json', this.allowed());
			importantFiles.push('angular.json');
			const ajPath = resolveSafePath(root, 'angular.json', this.allowed());
			const aj = JSON.parse(await readTextFileSafe(ajPath, this.cfg.maxToolFileReadBytes)) as {
				projects?: Record<string, unknown>;
			};
			angularProjects.push(...Object.keys(aj.projects ?? {}));
		} catch {
			/* optional */
		}
		const serverModules: string[] = [];
		try {
			const smDir = resolveSafePath(root, 'server/src', this.allowed());
			const ents = await fs.readdir(smDir, { withFileTypes: true });
			for (const e of ents) {
				if (e.isDirectory() && !e.name.startsWith('.')) serverModules.push(e.name);
			}
		} catch {
			/* optional */
		}
		let docsAvailable = false;
		try {
			const d = resolveSafePath(root, this.cfg.docsRootRelative, this.allowed());
			const st = await fs.stat(d);
			docsAvailable = st.isDirectory();
		} catch {
			docsAvailable = false;
		}
		return {
			projectType: packageJsonSummary?.['name'] ? 'node_monorepo' : 'unknown',
			packageJsonSummary: packageJsonSummary
				? {
						name: packageJsonSummary['name'],
						version: packageJsonSummary['version'],
						scripts: packageJsonSummary['scripts'],
					}
				: undefined,
			angularProjects,
			serverModules: serverModules.slice(0, 40),
			docsAvailable,
			importantFiles,
		};
	}
}
