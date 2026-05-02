import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { newId } from '../../common/utils/ids';
import { normalizedToolOutput } from '../models/internal-tool.model';
import type {
	McpServerConfig,
	McpServerRuntime,
	McpToolCallRequest,
	McpToolCallResult,
	McpToolDefinition,
	McpToolRiskLevel,
} from '../models/mcp-tool.model';
import { McpConfigLoaderService } from './mcp-config-loader.service';
import { McpClientService } from './mcp-client.service';
import { McpProcessManagerService } from './mcp-process-manager.service';
import { McpServerRepository } from '../repositories/mcp-server.repository';
import { McpToolRepository } from '../repositories/mcp-tool.repository';
import { McpToolCallRepository } from '../repositories/mcp-tool-call.repository';

const WRITE_TOOL_SUBSTRINGS = [
	'write',
	'delete',
	'remove',
	'update',
	'create',
	'mutate',
	'insert',
	'execute',
	'run_command',
	'shell',
	'deploy',
	'publish',
	'commit',
	'push',
	'merge',
];

const MCP_CALL_AGENTS = new Set(['fronto', 'doco', 'producto']);
const MCP_CALL_SERVERS = new Set(['docs-filesystem', 'demo-docs']);

@Injectable()
export class McpAdapterService implements OnModuleInit, OnModuleDestroy {
	private readonly log = new Logger(McpAdapterService.name);
	private readonly discovered = new Map<string, McpToolDefinition[]>();

	constructor(
		private readonly cfg: AppConfigService,
		private readonly loader: McpConfigLoaderService,
		private readonly process: McpProcessManagerService,
		private readonly client: McpClientService,
		private readonly servers: McpServerRepository,
		private readonly tools: McpToolRepository,
		private readonly calls: McpToolCallRepository,
	) {}

	async onModuleInit(): Promise<void> {
		await this.initializeConfiguredServers();
	}

	async onModuleDestroy(): Promise<void> {
		await this.process.stopAll();
	}

	async initializeConfiguredServers(): Promise<void> {
		if (!this.cfg.enableMcpAdapter) return;
		const list = await this.loader.loadConfig();
		for (const s of list) {
			try {
				if (!s.mockOnly) this.loader.validateServerConfig(s);
			} catch {
				/* skip invalid rows */
			}
			await this.servers.upsertFromConfig({
				id: s.id,
				name: s.name,
				description: s.description ?? null,
				transport: s.transport,
				enabled: s.enabled,
				status: s.enabled ? 'configured' : 'disabled',
				riskLevel: s.riskLevel,
				readOnly: s.readOnly,
				configJson: JSON.stringify({
					id: s.id,
					transport: s.transport,
					readOnly: s.readOnly,
					riskLevel: s.riskLevel,
				}),
			});
		}
	}

	async listConfiguredServers(): Promise<McpServerRuntime[]> {
		const list = await this.loader.loadConfig();
		if (!this.cfg.enableMcpAdapter) {
			return list.map((s) => ({
				id: s.id,
				name: s.name,
				status: 'disabled',
				transport: s.transport,
				toolCount: 0,
				readOnly: s.readOnly,
				riskLevel: s.riskLevel,
			}));
		}
		return list.map((s) => {
			const rt = this.process.getRuntime(s.id, this.discovered.get(s.id)?.length);
			if (rt) {
				return {
					...rt,
					name: s.name,
					readOnly: s.readOnly,
					riskLevel: s.riskLevel,
					toolCount: this.discovered.get(s.id)?.length ?? rt.toolCount,
				};
			}
			return {
				id: s.id,
				name: s.name,
				status: !s.enabled ? 'disabled' : 'configured',
				transport: s.transport,
				toolCount: this.discovered.get(s.id)?.length ?? 0,
				readOnly: s.readOnly,
				riskLevel: s.riskLevel,
			};
		});
	}

	async startServer(serverId: string): Promise<McpServerRuntime> {
		if (!this.cfg.enableMcpAdapter) {
			throw new Error('mcp_adapter_disabled');
		}
		const c = await this.loader.getServerConfig(serverId);
		if (!c) throw new Error('mcp_server_unknown');
		if (!c.enabled) throw new Error('mcp_server_disabled_in_config');
		await this.servers.upsertFromConfig({
			id: c.id,
			name: c.name,
			description: c.description ?? null,
			transport: c.transport,
			enabled: c.enabled,
			status: 'starting',
			riskLevel: c.riskLevel,
			readOnly: c.readOnly,
			configJson: JSON.stringify({
				id: c.id,
				transport: c.transport,
				readOnly: c.readOnly,
				mockOnly: c.mockOnly === true,
			}),
		});
		if (c.mockOnly) {
			await this.process.ensureMockSession(serverId, c.name);
			await this.servers.updateStatus(serverId, { status: 'running', error: null, startedAt: new Date() });
			const rt = this.process.getRuntime(serverId, this.discovered.get(serverId)?.length);
			if (!rt) throw new Error('mcp_mock_start_failed');
			return { ...rt, name: c.name, readOnly: c.readOnly, riskLevel: c.riskLevel };
		}
		this.assertTransportAllowed(c);
		this.loader.validateServerConfig(c);
		try {
			await this.process.startServer(c);
			await this.servers.updateStatus(serverId, { status: 'running', error: null, startedAt: new Date() });
		} catch (e) {
			const canMock = this.cfg.isDevelopment && this.cfg.mcpUseMockClientOnFailure;
			if (canMock) {
				this.log.warn(`MCP start failed for ${serverId}, ensuring demo-docs mock session`);
				await this.process.ensureMockSession('demo-docs', 'Demo MCP (fallback)');
			}
			await this.servers.updateStatus(serverId, {
				status: 'failed',
				error: e instanceof Error ? e.message : String(e),
				startedAt: null,
			});
			throw e;
		}
		const rt = this.process.getRuntime(serverId, this.discovered.get(serverId)?.length);
		if (!rt) throw new Error('mcp_start_state_missing');
		return { ...rt, name: c.name, readOnly: c.readOnly, riskLevel: c.riskLevel };
	}

	async stopServer(serverId: string): Promise<void> {
		await this.process.stopServer(serverId);
		await this.servers.updateStatus(serverId, { status: 'stopped', stoppedAt: new Date(), error: null });
		this.discovered.delete(serverId);
	}

	async discoverTools(serverId: string): Promise<McpToolDefinition[]> {
		if (!this.cfg.enableMcpAdapter) return [];
		const c = await this.loader.getServerConfig(serverId);
		if (!c || !c.enabled) return [];
		if (!this.process.getRuntime(serverId)) {
			await this.startServer(serverId).catch(() => undefined);
		}
		if (!this.process.getRuntime(serverId)) {
			return [];
		}
		const raw = await this.client.listTools(serverId);
		const defs: McpToolDefinition[] = raw.map((t) => ({
			serverId,
			name: t.name,
			description: t.description,
			inputSchema: t.inputSchema,
			riskLevel: (c.riskLevel as McpToolRiskLevel) ?? 'medium',
			readOnly: c.readOnly,
			enabled: !this.isToolBlockedByPolicy(t.name, t.description ?? '', c),
		}));
		this.discovered.set(serverId, defs);
		await this.tools.replaceServerTools(
			serverId,
			defs.map((d) => ({
				name: d.name,
				description: d.description ?? null,
				inputSchemaJson: d.inputSchema ? JSON.stringify(d.inputSchema) : null,
				riskLevel: d.riskLevel,
				readOnly: d.readOnly,
				enabled: d.enabled,
			})),
		);
		return defs;
	}

	async listTools(serverId?: string): Promise<McpToolDefinition[]> {
		if (!this.cfg.enableMcpAdapter) return [];
		if (serverId) {
			const mem = this.discovered.get(serverId);
			if (mem?.length) return mem;
			const rows = await this.tools.listByServer(serverId);
			return rows.map((r) => ({
				serverId: r.serverId,
				name: r.name,
				description: r.description ?? undefined,
				inputSchema: r.inputSchemaJson ? (JSON.parse(r.inputSchemaJson) as Record<string, unknown>) : undefined,
				riskLevel: r.riskLevel as McpToolRiskLevel,
				readOnly: r.readOnly,
				enabled: r.enabled,
			}));
		}
		const out: McpToolDefinition[] = [];
		for (const [, tools] of this.discovered) out.push(...tools);
		if (out.length) return out;
		const db = await this.tools.listAll();
		return db.map((r) => ({
			serverId: r.serverId,
			name: r.name,
			description: r.description ?? undefined,
			inputSchema: r.inputSchemaJson ? (JSON.parse(r.inputSchemaJson) as Record<string, unknown>) : undefined,
			riskLevel: r.riskLevel as McpToolRiskLevel,
			readOnly: r.readOnly,
			enabled: r.enabled,
		}));
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		if (!this.cfg.enableMcpAdapter) {
			return {
				serverId: req.serverId,
				toolName: req.toolName,
				content: '',
				isError: true,
				metadata: { code: 'mcp_adapter_disabled' },
			};
		}
		const c = await this.loader.getServerConfig(req.serverId);
		if (!c) {
			return { serverId: req.serverId, toolName: req.toolName, content: '', isError: true, metadata: { code: 'unknown_server' } };
		}
		if (this.isToolBlockedByPolicy(req.toolName, '', c)) {
			return {
				serverId: req.serverId,
				toolName: req.toolName,
				content: '',
				isError: true,
				metadata: { code: 'mcp_tool_blocked_policy' },
			};
		}
		if (!this.process.getRuntime(req.serverId)) {
			try {
				await this.startServer(req.serverId);
			} catch {
				/* startServer may have ensured demo-docs on dev + MCP_USE_MOCK_CLIENT_ON_FAILURE */
			}
		}
		if (!this.process.getRuntime(req.serverId)) {
			return {
				serverId: req.serverId,
				toolName: req.toolName,
				content: '',
				isError: true,
				metadata: { code: 'mcp_server_not_running' },
			};
		}
		const callId = newId('mcpc');
		await this.calls.create({
			id: callId,
			serverId: req.serverId,
			toolName: req.toolName,
			runId: req.runId ?? null,
			sessionId: req.sessionId ?? null,
			agentSlug: req.agentSlug ?? null,
			inputJson: JSON.stringify(req.input).slice(0, 50_000),
		});
		try {
			const r = await this.client.callTool(req.serverId, req.toolName, req.input);
			const capped = r.content.slice(0, this.cfg.mcpMaxOutputChars);
			await this.calls.complete(callId, {
				outputJson: JSON.stringify({ content: capped, structured: r.structured }).slice(0, 200_000),
				isError: r.isError,
				error: null,
				completedAt: new Date(),
			});
			return {
				serverId: req.serverId,
				toolName: req.toolName,
				content: capped,
				structuredContent: r.structured,
				isError: r.isError,
				metadata: { auditedCallId: callId },
			};
		} catch (e) {
			const err = e instanceof Error ? e.message : String(e);
			await this.calls.complete(callId, {
				outputJson: null,
				isError: true,
				error: err.slice(0, 4000),
				completedAt: new Date(),
			});
			return {
				serverId: req.serverId,
				toolName: req.toolName,
				content: '',
				isError: true,
				metadata: { error: err },
			};
		}
	}

	/** Maps registry tool ids to MCP operations — used by ToolExecutorService. */
	async executeRegistryTool(
		toolId: string,
		input: Record<string, unknown>,
		ctx: { runId?: string; sessionId?: string; agentSlug?: string },
	): Promise<Record<string, unknown>> {
		if (!this.cfg.enableMcpAdapter) {
			return { ...normalizedToolOutput('MCP', 'Adapter disabled', [], '', { source: 'mcp', blocked: true }) };
		}
		const agentSlug = ctx.agentSlug ?? '';
		switch (toolId) {
			case 'mcp_list_servers': {
				const list = await this.listConfiguredServers();
				return {
					...normalizedToolOutput('MCP servers', `${list.length} server(s)`, list, '', {
						source: 'mcp',
					}),
				};
			}
			case 'mcp_start_server': {
				const sid = String(input['serverId'] ?? '');
				const rt = await this.startServer(sid);
				return {
					...normalizedToolOutput(`MCP started: ${sid}`, rt.status, [rt], JSON.stringify(rt), { source: 'mcp' }),
				};
			}
			case 'mcp_stop_server': {
				const sid = String(input['serverId'] ?? '');
				await this.stopServer(sid);
				return {
					...normalizedToolOutput(`MCP stopped: ${sid}`, 'stopped', [], '', { source: 'mcp', serverId: sid }),
				};
			}
			case 'mcp_discover_tools': {
				const sid = String(input['serverId'] ?? '');
				const defs = await this.discoverTools(sid);
				return {
					...normalizedToolOutput(`MCP tools discovered: ${sid}`, `${defs.length} tool(s)`, defs, '', {
						source: 'mcp',
						serverId: sid,
					}),
				};
			}
			case 'mcp_list_tools': {
				const sid = input['serverId'] != null ? String(input['serverId']) : undefined;
				const defs = await this.listTools(sid);
				return {
					...normalizedToolOutput(
						sid ? `MCP tools (${sid})` : 'MCP tools (all)',
						`${defs.length} tool(s)`,
						defs,
						'',
						{ source: 'mcp', serverId: sid },
					),
				};
			}
			case 'mcp_call_tool': {
				if (!MCP_CALL_AGENTS.has(agentSlug)) {
					return {
						...normalizedToolOutput('MCP call blocked', 'Agent not allowed for MCP invocation', [], '', {
							source: 'mcp',
							blocked: true,
						}),
					};
				}
				const serverId = String(input['serverId'] ?? '');
				if (!MCP_CALL_SERVERS.has(serverId)) {
					return {
						...normalizedToolOutput('MCP call blocked', 'Server not allowlisted for agent MCP calls', [], '', {
							source: 'mcp',
							blocked: true,
						}),
					};
				}
				const toolName = String(input['toolName'] ?? '');
				const inner = (input['input'] as Record<string, unknown>) ?? {};
				const res = await this.callTool({
					serverId,
					toolName,
					input: inner,
					runId: ctx.runId,
					sessionId: ctx.sessionId,
					agentSlug: ctx.agentSlug,
				});
				const preview = res.content.slice(0, 4000);
				return {
					...normalizedToolOutput(
						`MCP ${serverId} / ${toolName}`,
						res.isError ? 'error' : 'ok',
						[res],
						preview,
						{ source: 'mcp', serverId, toolName, isError: res.isError },
					),
				};
			}
			default:
				return { ...normalizedToolOutput('MCP', 'unknown_tool', [], '', { source: 'mcp' }) };
		}
	}

	canAgentInvokeMcpTool(agentSlug: string | undefined, toolId: string): boolean {
		if (toolId === 'mcp_call_tool') return MCP_CALL_AGENTS.has(agentSlug ?? '');
		return true;
	}

	async getHealthSnapshot(): Promise<{
		configuredServers: number;
		runningServers: number;
	}> {
		const list = await this.loader.loadConfig();
		const running = this.process.listRuntimes().length;
		return { configuredServers: list.length, runningServers: running };
	}

	private assertTransportAllowed(c: McpServerConfig): void {
		if (c.transport === 'stdio' && !this.cfg.mcpAllowStdio) throw new Error('mcp_stdio_not_allowed');
		if (c.transport === 'http' && !this.cfg.mcpAllowHttp) throw new Error('mcp_http_not_allowed');
		if (c.transport === 'sse' && !this.cfg.mcpAllowSse) throw new Error('mcp_sse_not_allowed');
	}

	private isToolBlockedByPolicy(toolName: string, description: string, server: McpServerConfig): boolean {
		const lower = `${toolName} ${description}`.toLowerCase();
		if (server.deniedTools?.some((d) => toolName === d || lower.includes(d.toLowerCase()))) return true;
		if (server.allowedTools && server.allowedTools.length > 0 && !server.allowedTools.includes(toolName)) {
			return true;
		}
		if (this.cfg.mcpAllowWriteTools) return false;
		return WRITE_TOOL_SUBSTRINGS.some((w) => lower.includes(w));
	}
}
