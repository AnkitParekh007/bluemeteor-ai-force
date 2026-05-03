import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { readTextFileSafe, resolveSafePath } from '../../common/utils/safe-file-reader';
import type { ApiEndpointDetail, ApiEndpointSummary } from '../models/api-catalog-tool.model';

interface CatalogFile {
	readonly apis: ApiEndpointDetail[];
}

@Injectable()
export class ApiCatalogReaderService {
	private readonly log = new Logger(ApiCatalogReaderService.name);
	private cache: ApiEndpointDetail[] | null = null;

	constructor(private readonly cfg: AppConfigService) {}

	private async load(): Promise<ApiEndpointDetail[]> {
		if (this.cache) return this.cache;
		if (!this.cfg.enableApiCatalogReader) {
			this.cache = [];
			return this.cache;
		}
		try {
			const rel = this.cfg.apiCatalogPathRelative;
			const abs = resolveSafePath(this.cfg.repositoryRootAbs, rel, this.cfg.repositoryAllowedPaths);
			const raw = await readTextFileSafe(abs, this.cfg.maxToolFileReadBytes);
			const parsed = JSON.parse(raw) as CatalogFile;
			this.cache = parsed.apis ?? [];
		} catch (e) {
			this.log.warn(`api catalog load failed: ${e instanceof Error ? e.message : e}`);
			this.cache = [];
		}
		return this.cache;
	}

	async listApis(): Promise<ApiEndpointSummary[]> {
		const all = await this.load();
		return all.map((a) => ({
			id: a.id,
			method: a.method,
			path: a.path,
			summary: a.summary,
			tags: a.tags ?? [],
		}));
	}

	async getApi(endpointId: string): Promise<ApiEndpointDetail | undefined> {
		const all = await this.load();
		return all.find((a) => a.id === endpointId);
	}

	async searchApis(query: string, limit = 25): Promise<ApiEndpointSummary[]> {
		const q = query.trim().toLowerCase();
		const all = await this.load();
		if (!q) return (await this.listApis()).slice(0, limit);
		return all
			.filter(
				(a) =>
					a.path.toLowerCase().includes(q) ||
					a.summary.toLowerCase().includes(q) ||
					a.method.toLowerCase().includes(q) ||
					(a.tags ?? []).some((t) => t.toLowerCase().includes(q)),
			)
			.slice(0, limit)
			.map((a) => ({
				id: a.id,
				method: a.method,
				path: a.path,
				summary: a.summary,
				tags: a.tags ?? [],
			}));
	}
}
