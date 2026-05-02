import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

export interface ConnectorHttpOptions {
	readonly headers?: Record<string, string>;
	readonly authHeader?: string;
}

@Injectable()
export class ConnectorHttpService {
	private readonly log = new Logger(ConnectorHttpService.name);

	constructor(private readonly cfg: AppConfigService) {}

	private mergeHeaders(base: Record<string, string>, extra?: Record<string, string>): Record<string, string> {
		return { Accept: 'application/json', 'User-Agent': 'bluemeteor-ai-force-connector/1', ...base, ...extra };
	}

	private redactHeaders(h: Record<string, string>): Record<string, string> {
		const o = { ...h };
		if (o['Authorization']) o['Authorization'] = '[redacted]';
		return o;
	}

	private normalizeHttpError(status: number, bodySnippet: string): Error {
		if (status === 401) return new Error('HTTP 401: unauthorized');
		if (status === 403) return new Error('HTTP 403: forbidden');
		if (status === 404) return new Error('HTTP 404: not found');
		if (status === 429) return new Error('HTTP 429: rate limited');
		if (status >= 500) return new Error(`HTTP ${status}: server error`);
		return new Error(`HTTP ${status}: ${bodySnippet.slice(0, 200)}`);
	}

	private async fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number }): Promise<Response> {
		const timeoutMs = init.timeoutMs ?? this.cfg.connectorHttpTimeoutMs;
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), timeoutMs);
		try {
			return await fetch(url, { ...init, signal: ctrl.signal });
		} catch (e) {
			if ((e as Error).name === 'AbortError') throw new Error(`Request timeout after ${timeoutMs}ms`);
			throw e;
		} finally {
			clearTimeout(t);
		}
	}

	private async getOnce(url: string, headers: Record<string, string>): Promise<Response> {
		return this.fetchWithTimeout(url, { method: 'GET', headers, timeoutMs: this.cfg.connectorHttpTimeoutMs });
	}

	async getJson<T>(url: string, options: ConnectorHttpOptions = {}, retryOnce = true): Promise<T> {
		const headers = this.mergeHeaders({}, options.headers);
		if (options.authHeader) headers['Authorization'] = options.authHeader;
		let res = await this.getOnce(url, headers);
		if (retryOnce && (res.status === 429 || res.status >= 500)) {
			await new Promise((r) => setTimeout(r, 450));
			res = await this.getOnce(url, headers);
		}
		const text = await res.text();
		const max = this.cfg.connectorMaxContentChars + 100_000;
		const capped = text.length > max ? text.slice(0, max) : text;
		if (!res.ok) {
			this.log.warn(`GET ${url} -> ${res.status} (headers ${JSON.stringify(this.redactHeaders(headers))})`);
			throw this.normalizeHttpError(res.status, capped);
		}
		try {
			return JSON.parse(capped) as T;
		} catch {
			throw new Error('Invalid JSON response');
		}
	}

	async postJson<T>(url: string, body: unknown, options: ConnectorHttpOptions = {}): Promise<T> {
		const headers = this.mergeHeaders({ 'Content-Type': 'application/json' }, options.headers);
		if (options.authHeader) headers['Authorization'] = options.authHeader;
		const res = await this.fetchWithTimeout(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			timeoutMs: this.cfg.connectorHttpTimeoutMs,
		});
		const text = await res.text();
		const max = this.cfg.connectorMaxContentChars + 100_000;
		const capped = text.length > max ? text.slice(0, max) : text;
		if (!res.ok) {
			this.log.warn(`POST ${url} -> ${res.status}`);
			throw this.normalizeHttpError(res.status, capped);
		}
		try {
			return JSON.parse(capped) as T;
		} catch {
			throw new Error('Invalid JSON response');
		}
	}

	async getText(url: string, options: ConnectorHttpOptions = {}, retryOnce = true): Promise<string> {
		const headers = this.mergeHeaders({}, options.headers);
		if (options.authHeader) headers['Authorization'] = options.authHeader;
		let res = await this.getOnce(url, headers);
		if (retryOnce && (res.status === 429 || res.status >= 500)) {
			await new Promise((r) => setTimeout(r, 450));
			res = await this.getOnce(url, headers);
		}
		const text = await res.text();
		const max = this.cfg.connectorMaxContentChars + 50_000;
		if (!res.ok) throw this.normalizeHttpError(res.status, text);
		return text.length > max ? text.slice(0, max) : text;
	}
}
