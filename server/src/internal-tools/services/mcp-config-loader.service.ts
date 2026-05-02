import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import type { McpServerConfig, McpToolRiskLevel, McpTransport } from '../models/mcp-tool.model';

interface RawMcpFile {
	readonly servers?: unknown[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asRisk(v: unknown): McpToolRiskLevel {
	const s = String(v ?? 'medium').toLowerCase();
	if (s === 'low' || s === 'medium' || s === 'high' || s === 'critical') return s;
	return 'medium';
}

function asTransport(v: unknown, allowSse: boolean): McpTransport {
	const s = String(v ?? 'stdio').toLowerCase();
	if (s === 'stdio' || s === 'http') return s;
	if (s === 'sse') return allowSse ? 'sse' : 'stdio';
	return 'stdio';
}

@Injectable()
export class McpConfigLoaderService {
	private readonly log = new Logger(McpConfigLoaderService.name);

	constructor(private readonly cfg: AppConfigService) {}

	/** Absolute path to MCP JSON — must stay under repository root. */
	getMcpConfigAbsolutePath(): string {
		const rel = this.cfg.mcpConfigPathRelative.replace(/^[/\\]+/, '');
		const abs = path.resolve(this.cfg.repositoryRootAbs, rel);
		const root = path.resolve(this.cfg.repositoryRootAbs);
		if (!abs.startsWith(root)) {
			throw new Error('mcp_config_path_outside_repo');
		}
		return abs;
	}

	async loadConfig(): Promise<McpServerConfig[]> {
		try {
			const abs = this.getMcpConfigAbsolutePath();
			const raw = await fs.readFile(abs, 'utf8');
			const parsed = JSON.parse(raw) as RawMcpFile;
			const servers = Array.isArray(parsed.servers) ? parsed.servers : [];
			const seen = new Set<string>();
			const out: McpServerConfig[] = [];
			for (const s of servers) {
				if (!isRecord(s)) continue;
				const cfg = this.normalizeServer(s, seen);
				if (cfg) out.push(cfg);
			}
			return out;
		} catch (e) {
			this.log.warn(`MCP config load failed: ${e instanceof Error ? e.message : e}`);
			return [];
		}
	}

	async getEnabledServers(): Promise<McpServerConfig[]> {
		const all = await this.loadConfig();
		return all.filter((s) => s.enabled);
	}

	async getServerConfig(serverId: string): Promise<McpServerConfig | null> {
		const all = await this.loadConfig();
		return all.find((s) => s.id === serverId) ?? null;
	}

	validateServerConfig(config: McpServerConfig): void {
		if (!config.id?.trim()) throw new Error('mcp_server_id_required');
		if (!config.name?.trim()) throw new Error('mcp_server_name_required');
		if (config.mockOnly) return;
		if (config.transport === 'stdio') {
			if (!config.command?.trim()) throw new Error('mcp_stdio_command_required');
			const cmd = path.basename(config.command.trim().toLowerCase());
			const allowed = this.cfg.mcpAllowedCommands;
			if (!allowed.some((a) => cmd === a.toLowerCase() || cmd === `${a.toLowerCase()}.cmd`)) {
				throw new Error('mcp_command_not_allowlisted');
			}
		}
		if (config.transport === 'http' || config.transport === 'sse') {
			const u = config.url?.trim() ?? '';
			if (!u) throw new Error('mcp_http_url_required');
			const lower = u.toLowerCase();
			if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
				throw new Error('mcp_url_must_be_http');
			}
			if (lower.startsWith('file:')) throw new Error('mcp_file_url_blocked');
		}
	}

	/** Safe for UI / API — strips environment values and full URLs. */
	async getSafePublicConfig(): Promise<
		Array<{
			id: string;
			name: string;
			description?: string;
			enabled: boolean;
			transport: McpTransport;
			riskLevel: McpToolRiskLevel;
			readOnly: boolean;
			hasEnvironment: boolean;
			commandSummary?: string;
			argsCount: number;
			urlHost?: string;
		}>
	> {
		const all = await this.loadConfig();
		return all.map((s) => {
			let commandSummary: string | undefined;
			if (s.command) commandSummary = path.basename(s.command.trim());
			let urlHost: string | undefined;
			if (s.url) {
				try {
					urlHost = new URL(s.url).host;
				} catch {
					urlHost = '(invalid)';
				}
			}
			const env = s.environment;
			return {
				id: s.id,
				name: s.name,
				description: s.description,
				enabled: s.enabled,
				transport: s.transport,
				riskLevel: s.riskLevel,
				readOnly: s.readOnly,
				hasEnvironment: !!env && Object.keys(env).length > 0,
				commandSummary,
				argsCount: s.args?.length ?? 0,
				urlHost,
			};
		});
	}

	private normalizeServer(s: Record<string, unknown>, seen: Set<string>): McpServerConfig | null {
		const id = String(s['id'] ?? '').trim();
		if (!id || seen.has(id)) return null;
		seen.add(id);
		const name = String(s['name'] ?? id).trim();
		const description = s['description'] != null ? String(s['description']) : undefined;
		const enabled = Boolean(s['enabled']);
		const transport = asTransport(s['transport'], this.cfg.mcpAllowSse);
		const command = s['command'] != null ? String(s['command']) : undefined;
		const args = Array.isArray(s['args']) ? s['args'].map((a) => String(a)) : undefined;
		const url = s['url'] != null ? String(s['url']) : undefined;
		const workingDirectory = s['workingDirectory'] != null ? String(s['workingDirectory']) : undefined;
		let environment: Record<string, string> | undefined;
		if (isRecord(s['environment'])) {
			environment = {};
			for (const [k, v] of Object.entries(s['environment'])) {
				if (typeof v === 'string') environment[k] = v;
			}
		}
		const riskLevel = asRisk(s['riskLevel']);
		const allowedTools = Array.isArray(s['allowedTools'])
			? s['allowedTools'].map((t) => String(t))
			: undefined;
		const deniedTools = Array.isArray(s['deniedTools'])
			? s['deniedTools'].map((t) => String(t))
			: undefined;
		const readOnly = s['readOnly'] !== false;
		const mockOnly = s['mockOnly'] === true;
		return {
			id,
			name,
			description,
			enabled,
			transport,
			command,
			args,
			url,
			workingDirectory,
			environment,
			riskLevel,
			allowedTools,
			deniedTools,
			readOnly,
			mockOnly,
		};
	}
}
