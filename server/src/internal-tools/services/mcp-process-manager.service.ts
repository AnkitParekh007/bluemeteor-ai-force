import * as path from 'node:path';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

// CJS entry — avoids package "exports" resolution limits under Nest's default tsconfig.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require('@modelcontextprotocol/sdk/dist/cjs/client/index.js') as {
	Client: new (info: { name: string; version: string }, options?: { capabilities?: Record<string, unknown> }) => {
		connect(transport: unknown): Promise<void>;
		listTools(): Promise<unknown>;
		callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<unknown>;
		close(): Promise<void>;
	};
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/dist/cjs/client/stdio.js') as {
	StdioClientTransport: new (params: {
		command: string;
		args?: string[];
		cwd?: string;
		stderr?: string;
		env?: Record<string, string>;
	}) => {
		stderr: unknown;
		close(): Promise<void>;
	};
};
import type { McpServerConfig, McpServerRuntime, McpToolDefinition } from '../models/mcp-tool.model';

type SdkClient = InstanceType<typeof Client>;
type SdkTransport = InstanceType<typeof StdioClientTransport>;

type StdioSession = {
	readonly kind: 'stdio';
	readonly client: SdkClient;
	readonly transport: SdkTransport;
};

type MockSession = { readonly kind: 'mock' };

type Session = StdioSession | MockSession;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
		p.then(
			(v) => {
				clearTimeout(t);
				resolve(v);
			},
			(e) => {
				clearTimeout(t);
				reject(e);
			},
		);
	});
}

const MOCK_TOOLS: McpToolDefinition[] = [
	{
		serverId: 'demo-docs',
		name: 'search_docs',
		description: 'Search internal documentation (demo)',
		riskLevel: 'low',
		readOnly: true,
		enabled: true,
	},
	{
		serverId: 'demo-docs',
		name: 'read_doc',
		description: 'Read a documentation fragment (demo)',
		riskLevel: 'low',
		readOnly: true,
		enabled: true,
	},
	{
		serverId: 'demo-docs',
		name: 'list_docs',
		description: 'List documentation topics (demo)',
		riskLevel: 'low',
		readOnly: true,
		enabled: true,
	},
];

@Injectable()
export class McpProcessManagerService implements OnModuleDestroy {
	private readonly log = new Logger(McpProcessManagerService.name);
	private readonly sessions = new Map<string, Session>();
	private readonly sessionMeta = new Map<string, { name: string; transport: import('../models/mcp-tool.model').McpTransport }>();
	private readonly stderrBuffers = new Map<string, string>();
	private readonly lastError = new Map<string, string>();

	constructor(private readonly appCfg: AppConfigService) {}

	async onModuleDestroy(): Promise<void> {
		await this.stopAll();
	}

	async stopAll(): Promise<void> {
		for (const id of [...this.sessions.keys()]) {
			await this.stopServer(id);
		}
	}

	getRuntime(serverId: string, toolCountOverride?: number): McpServerRuntime | null {
		const s = this.sessions.get(serverId);
		if (!s) return null;
		const meta = this.sessionMeta.get(serverId);
		const toolCount = toolCountOverride ?? (s.kind === 'mock' ? MOCK_TOOLS.length : 0);
		return {
			id: serverId,
			name: meta?.name ?? serverId,
			status: 'running',
			transport: meta?.transport ?? 'stdio',
			toolCount,
			readOnly: true,
			riskLevel: 'low',
		};
	}

	listRuntimes(toolCounts?: Map<string, number>): McpServerRuntime[] {
		return [...this.sessions.keys()]
			.map((id) => this.getRuntime(id, toolCounts?.get(id)))
			.filter((r): r is McpServerRuntime => r != null);
	}

	async ensureMockSession(serverId: string, displayName?: string): Promise<void> {
		if (this.sessions.has(serverId)) return;
		this.sessions.set(serverId, { kind: 'mock' });
		this.sessionMeta.set(serverId, { name: displayName ?? serverId, transport: 'stdio' });
	}

	async startServer(config: McpServerConfig): Promise<void> {
		if (this.sessions.has(config.id)) return;
		if (config.transport === 'http' || config.transport === 'sse') {
			throw new Error('mcp_transport_not_implemented_use_stdio');
		}
		if (!this.appCfg.mcpAllowStdio) {
			throw new Error('mcp_stdio_disabled_by_policy');
		}
		const cwd = this.resolveServerCwd(config);
		const stderrChunks: string[] = [];
		const transport = new StdioClientTransport({
			command: config.command!,
			args: config.args ?? [],
			cwd,
			stderr: 'pipe',
			env: config.environment,
		});
		const stderrStream = transport.stderr;
		if (stderrStream != null && typeof stderrStream === 'object' && 'on' in stderrStream) {
			(stderrStream as unknown as NodeJS.ReadableStream).on('data', (chunk: Buffer) => {
				const s = chunk.toString('utf8');
				stderrChunks.push(s);
				const joined = stderrChunks.join('');
				if (joined.length > 8000) stderrChunks.splice(0, stderrChunks.length - 1, joined.slice(-8000));
			});
		}
		const client = new Client({ name: 'bluemeteor-ai-force', version: '0.0.1' }, { capabilities: {} });
		try {
			await withTimeout(
				client.connect(transport),
				this.appCfg.mcpServerStartupTimeoutMs,
				'mcp_server_startup',
			);
			this.sessions.set(config.id, { kind: 'stdio', client, transport });
			this.sessionMeta.set(config.id, { name: config.name, transport: config.transport });
			this.stderrBuffers.set(config.id, stderrChunks.join('').slice(-4000));
			this.lastError.delete(config.id);
		} catch (e) {
			const err = e instanceof Error ? e.message : String(e);
			this.lastError.set(config.id, err);
			const stderrText = stderrChunks.join('').slice(-4000);
			try {
				await transport.close();
			} catch {
				/* ignore */
			}
			try {
				await client.close();
			} catch {
				/* ignore */
			}
			this.log.warn(`MCP start failed for ${config.id}: ${err} stderr=${stderrText.slice(0, 500)}`);
			throw e;
		}
	}

	async stopServer(serverId: string): Promise<void> {
		const s = this.sessions.get(serverId);
		if (!s) return;
		this.sessions.delete(serverId);
		this.sessionMeta.delete(serverId);
		this.stderrBuffers.delete(serverId);
		if (s.kind === 'stdio') {
			try {
				await s.client.close();
			} catch {
				/* ignore */
			}
			try {
				await s.transport.close();
			} catch {
				/* ignore */
			}
		}
	}

	async listToolsFromSession(
		serverId: string,
	): Promise<Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>> {
		const s = this.sessions.get(serverId);
		if (!s) throw new Error('mcp_server_not_running');
		if (s.kind === 'mock') {
			return MOCK_TOOLS.map((t) => ({ name: t.name, description: t.description }));
		}
		const res = (await withTimeout(
			s.client.listTools(),
			this.appCfg.mcpServerStartupTimeoutMs,
			'mcp_list_tools',
		)) as { tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> };
		const tools = res.tools ?? [];
		return tools.map((t: { name: string; description?: string; inputSchema?: Record<string, unknown> }) => ({
			name: t.name,
			description: t.description ?? undefined,
			inputSchema: t.inputSchema as Record<string, unknown> | undefined,
		}));
	}

	async callToolOnSession(
		serverId: string,
		toolName: string,
		input: Record<string, unknown>,
	): Promise<{ content: string; structured?: Record<string, unknown>; isError: boolean }> {
		const s = this.sessions.get(serverId);
		if (!s) throw new Error('mcp_server_not_running');
		if (s.kind === 'mock') {
			return this.mockCallTool(toolName, input);
		}
		const res = (await withTimeout(
			s.client.callTool({ name: toolName, arguments: input }),
			this.appCfg.mcpToolCallTimeoutMs,
			'mcp_call_tool',
		)) as {
			content?: Array<{ type: string; text?: string }>;
			structuredContent?: unknown;
			isError?: boolean;
		};
		const parts: string[] = [];
		let structured: Record<string, unknown> | undefined;
		for (const c of res.content ?? []) {
			if (c.type === 'text' && 'text' in c) parts.push(String((c as { text?: string }).text ?? ''));
		}
		const text = parts.join('\n').slice(0, this.appCfg.mcpMaxOutputChars);
		if (res.structuredContent && typeof res.structuredContent === 'object') {
			structured = res.structuredContent as Record<string, unknown>;
		}
		return { content: text, structured, isError: Boolean(res.isError) };
	}

	getLastStartError(serverId: string): string | undefined {
		return this.lastError.get(serverId);
	}

	private resolveServerCwd(config: McpServerConfig): string {
		const base = this.appCfg.mcpWorkingDirectoryAbs;
		const rel = (config.workingDirectory ?? '.').replace(/^[/\\]+/, '');
		const cwd = path.resolve(base, rel);
		const root = path.resolve(this.appCfg.repositoryRootAbs);
		if (!cwd.startsWith(root)) {
			throw new Error('mcp_cwd_outside_repository');
		}
		return cwd;
	}

	private mockCallTool(
		toolName: string,
		input: Record<string, unknown>,
	): { content: string; structured?: Record<string, unknown>; isError: boolean } {
		const q = typeof input['query'] === 'string' ? input['query'] : '';
		const docPath = typeof input['path'] === 'string' ? input['path'] : '';
		if (toolName === 'search_docs') {
			return {
				content: `Demo MCP search for "${q}": Supplier upload workflow, SKU status guide, syndication delays, agent workspace overview.`,
				isError: false,
			};
		}
		if (toolName === 'read_doc') {
			return {
				content: `Demo read_doc(${docPath || q || 'overview'}): See docs/internal-tools-guide.md for read-only tool policies.`,
				isError: false,
			};
		}
		if (toolName === 'list_docs') {
			return {
				content:
					'- supplier-upload-workflow\n- sku-status\n- syndication\n- agent-workspace\n- internal-tool-hub',
				isError: false,
			};
		}
		return { content: `Unknown demo tool: ${toolName}`, isError: true };
	}
}
