import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { listFilesSafe, readTextFileSafe, resolveSafePath } from '../../common/utils/safe-file-reader';
import type { CicdAnalysis } from '../models/cicd-tool.model';
import type { FileSummary, RepositoryFileContent } from '../models/repository-tool.model';

@Injectable()
export class CicdReaderService {
	constructor(private readonly cfg: AppConfigService) {}

	private allowed(): string[] {
		return this.cfg.cicdAllowedFiles;
	}

	async listCicdFiles(): Promise<FileSummary[]> {
		if (!this.cfg.enableCicdReader) return [];
		const root = this.cfg.repositoryRootAbs;
		const allowed = this.allowed();
		const max = this.cfg.maxToolFileReadBytes;
		const files: FileSummary[] = [];
		for (const rel of allowed) {
			const norm = rel.replace(/\\/g, '/').replace(/^\/+/, '');
			try {
				const abs = resolveSafePath(root, norm, this.cfg.repositoryAllowedPaths);
				const stat = await fs.stat(abs);
				if (stat.isDirectory()) {
					const sub = await listFilesSafe(root, [norm], { maxDepth: 6, maxFiles: 200, maxFileBytes: max });
					files.push(...sub.map((f) => ({ path: f.path, name: f.name, extension: f.extension, size: f.size, modifiedAt: f.modifiedAt })));
				} else {
					files.push({
						path: norm,
						name: path.basename(norm),
						extension: path.extname(norm).toLowerCase(),
						size: stat.size,
					});
				}
			} catch {
				/* missing optional file */
			}
		}
		const seen = new Set<string>();
		return files.filter((f) => (seen.has(f.path) ? false : (seen.add(f.path), true)));
	}

	async readCicdFile(relPath: string): Promise<RepositoryFileContent> {
		if (!this.cfg.enableCicdReader) throw new Error('cicd_reader_disabled');
		const norm = relPath.replace(/\\/g, '/');
		const hit = this.allowed().some((a) => norm === a || norm.startsWith(a.replace(/\/+$/, '') + '/'));
		if (!hit) throw new Error('cicd_path_not_allowed');
		const abs = resolveSafePath(this.cfg.repositoryRootAbs, norm, this.cfg.repositoryAllowedPaths);
		const content = await readTextFileSafe(abs, this.cfg.maxToolFileReadBytes);
		const ext = path.extname(norm).toLowerCase();
		return {
			path: norm,
			content,
			language: ext === '.yml' || ext === '.yaml' ? 'yaml' : ext === '.json' ? 'json' : 'text',
			size: Buffer.byteLength(content, 'utf8'),
		};
	}

	async analyzeCicdConfig(): Promise<CicdAnalysis> {
		const files = await this.listCicdFiles();
		const findings: string[] = [];
		const riskHints: string[] = [];
		for (const f of files.slice(0, 25)) {
			if (!/\.(yml|yaml|json)$/.test(f.path)) continue;
			try {
				const body = await this.readCicdFile(f.path);
				const lower = body.content.toLowerCase();
				if (lower.includes('npm publish') || lower.includes('deploy')) {
					findings.push(`${f.path}: references publish/deploy steps — verify approvals and secrets handling.`);
				}
				if (lower.includes('password') || lower.includes('secret')) {
					riskHints.push(`${f.path}: mentions secrets — ensure CI secrets are not inlined in repo files.`);
				}
				if (lower.includes('curl ') && lower.includes('http')) {
					riskHints.push(`${f.path}: uses curl — confirm targets are trusted and pinned.`);
				}
			} catch {
				/* skip */
			}
		}
		return {
			summary: `Reviewed ${files.length} CI/CD-related paths (read-only).`,
			filesConsidered: files.map((f) => f.path),
			findings: findings.slice(0, 12),
			riskHints: riskHints.slice(0, 12),
		};
	}
}
