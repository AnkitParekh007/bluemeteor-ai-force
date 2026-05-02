import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { concatMap, delay } from 'rxjs/operators';

/** Nest `POST …/messages/stream-start` response. */
export interface AgentStreamStartResponse {
	readonly runId: string;
	readonly streamUrl: string;
	readonly userMessageId: string;
}

import { environment } from '../../../environments/environment';
import type { McpHealthResponse, McpServerRuntime, McpToolCallResult, McpToolDefinition } from '../models/mcp.models';
import type { AgentArtifact } from '../models/agent-artifact.models';
import type {
	AgentBrowserState,
	AgentChatMessage,
	AgentSession,
	AgentTestResult,
} from '../models/agent-session.models';
import type { AgentWorkspaceMode } from '../models/agent-session.models';
import type { AgentRun, AgentRuntimeEvent } from '../models/agent-runtime.models';
import { MockAgentBackendService, type MockConsoleLine } from './mock-agent-backend.service';

/**
 * Contract for `POST …/agents/sessions/:sessionId/messages` (Nest orchestrator).
 * Optional fields mirror mock transport; omit or null when not applicable.
 * Validate server DTOs against this shape when `enableMockAgents` is false.
 */
export interface AgentSendResponse {
	readonly run: AgentRun;
	readonly message: AgentChatMessage;
	readonly artifacts: AgentArtifact[];
	readonly events: AgentRuntimeEvent[];
	readonly suggestedChips?: string[];
	readonly testResults?: AgentTestResult[] | null;
	readonly browserPatch?: Partial<AgentBrowserState> | null;
	readonly consoleLines?: MockConsoleLine[];
}

/** Single place that knows backend URLs and transport shape. */
@Injectable({ providedIn: 'root' })
export class AgentApiService {
	private readonly http = inject(HttpClient);
	private readonly mock = inject(MockAgentBackendService);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	createSession(agentSlug: string, mode: AgentWorkspaceMode): Observable<AgentSession> {
		if (environment.enableMockAgents) {
			return of(this.mock.createMockSession(agentSlug, mode));
		}
		return this.http.post<AgentSession>(`${this.base()}/agents/${encodeURIComponent(agentSlug)}/sessions`, {
			mode,
		});
	}

	listSessions(agentSlug: string): Observable<AgentSession[]> {
		if (environment.enableMockAgents) {
			return of(this.mock.listMockSessions(agentSlug));
		}
		return this.http.get<AgentSession[]>(
			`${this.base()}/agents/${encodeURIComponent(agentSlug)}/sessions`,
		);
	}

	getSession(sessionId: string): Observable<AgentSession> {
		if (environment.enableMockAgents) {
			return throwError(() => new Error('getSession: use store in mock mode'));
		}
		return this.http.get<AgentSession>(`${this.base()}/agents/sessions/${encodeURIComponent(sessionId)}`);
	}

	/** Hydrate chat after refresh — matches `GET /agents/sessions/:sessionId/messages`. */
	listSessionMessages(sessionId: string): Observable<AgentChatMessage[]> {
		if (environment.enableMockAgents) {
			return of([]);
		}
		return this.http.get<AgentChatMessage[]>(
			`${this.base()}/agents/sessions/${encodeURIComponent(sessionId)}/messages`,
		);
	}

	sendMessage(request: {
		sessionId: string;
		agentSlug: string;
		mode: AgentWorkspaceMode;
		message: string;
		context?: Record<string, unknown>;
	}): Observable<AgentSendResponse> {
		if (environment.enableMockAgents) {
			const res = this.mock.createMockRun(
				request.sessionId,
				request.agentSlug,
				request.mode,
				request.message,
			);
			const payload: AgentSendResponse = {
				run: res.run,
				message: res.message,
				artifacts: res.artifacts,
				events: res.events,
				suggestedChips: res.suggestedChips,
				testResults: res.testResults,
				browserPatch: res.browserPatch,
				consoleLines: res.consoleLines,
			};
			return of(payload);
		}
		// Nest: request/response JSON must match AgentSendResponse (see interface JSDoc).
		return this.http.post<AgentSendResponse>(
			`${this.base()}/agents/sessions/${encodeURIComponent(request.sessionId)}/messages`,
			request,
		);
	}

	/**
	 * Mock-only: play canned runtime events. Live API uses `startStreamingMessage` + `connectToRunEvents`.
	 */
	streamRun(request: {
		sessionId: string;
		agentSlug: string;
		mode: AgentWorkspaceMode;
		message: string;
	}): Observable<AgentRuntimeEvent> {
		if (!environment.enableMockAgents) {
			return throwError(
				() =>
					new Error(
						'streamRun is mock-only; use startStreamingMessage + connectToRunEvents for the Nest API.',
					),
			);
		}
		if (!environment.enableAgentStreaming) {
			return throwError(() => new Error('Streaming disabled'));
		}
		const res = this.mock.createMockRun(
			request.sessionId,
			request.agentSlug,
			request.mode,
			request.message,
		);
		return from(res.events).pipe(concatMap((e) => of(e).pipe(delay(40))));
	}

	startStreamingMessage(request: {
		sessionId: string;
		agentSlug: string;
		mode: AgentWorkspaceMode;
		message: string;
		context?: Record<string, unknown>;
	}): Observable<AgentStreamStartResponse> {
		if (environment.enableMockAgents) {
			return throwError(() => new Error('startStreamingMessage requires live API (enableMockAgents false)'));
		}
		return this.http.post<AgentStreamStartResponse>(
			`${this.base()}/agents/sessions/${encodeURIComponent(request.sessionId)}/messages/stream-start`,
			request,
		);
	}

	/** Subscribe to `GET …/runs/:runId/events` (SSE). */
	connectToRunEvents(streamUrl: string): Observable<AgentRuntimeEvent> {
		return new Observable<AgentRuntimeEvent>((sub) => {
			const url =
				streamUrl.startsWith('http://') || streamUrl.startsWith('https://')
					? streamUrl
					: `${this.base()}${streamUrl.startsWith('/') ? '' : '/'}${streamUrl}`;
			const es = new EventSource(url);
			let terminal = false;
			const closeQuietly = () => {
				terminal = true;
				es.close();
			};
			es.onmessage = (ev: MessageEvent<string>) => {
				try {
					const parsed = JSON.parse(ev.data) as AgentRuntimeEvent;
					sub.next(parsed);
					if (parsed.type === 'run_completed' || parsed.type === 'run_failed') {
						closeQuietly();
						sub.complete();
					}
				} catch (err) {
					closeQuietly();
					sub.error(err instanceof Error ? err : new Error(String(err)));
				}
			};
			es.onerror = () => {
				if (terminal) return;
				closeQuietly();
				sub.error(new Error('Connection lost (SSE)'));
			};
			return () => {
				closeQuietly();
			};
		});
	}

	submitApproval(request: {
		sessionId: string;
		runId: string;
		approvalId: string;
		decision: 'approved' | 'rejected';
	}): Observable<void> {
		if (environment.enableMockAgents) {
			return of(undefined);
		}
		return this.http.post<void>(
			`${this.base()}/agents/sessions/${encodeURIComponent(request.sessionId)}/runs/${encodeURIComponent(request.runId)}/approvals/${encodeURIComponent(request.approvalId)}`,
			{ decision: request.decision },
		);
	}

	getArtifacts(sessionId: string): Observable<AgentArtifact[]> {
		if (environment.enableMockAgents) {
			return of([]);
		}
		return this.http.get<AgentArtifact[]>(
			`${this.base()}/agents/sessions/${encodeURIComponent(sessionId)}/artifacts`,
		);
	}

	getRun(runId: string): Observable<AgentRun> {
		if (environment.enableMockAgents) {
			return throwError(() => new Error('getRun: use store in mock mode'));
		}
		return this.http.get<AgentRun>(`${this.base()}/agents/runs/${encodeURIComponent(runId)}`);
	}

	getActivity(sessionId: string): Observable<AgentRuntimeEvent[]> {
		if (environment.enableMockAgents) {
			return of([]);
		}
		return this.http.get<AgentRuntimeEvent[]>(
			`${this.base()}/agents/sessions/${encodeURIComponent(sessionId)}/activity`,
		);
	}

	// ——— MCP debug / admin (Nest `McpController`) ———

	getMcpHealth(): Observable<McpHealthResponse> {
		if (environment.enableMockAgents) {
			return of({
				enabled: false,
				configuredServers: 0,
				runningServers: 0,
				allowStdio: false,
				allowHttp: false,
				allowWriteTools: false,
			});
		}
		return this.http.get<McpHealthResponse>(`${this.base()}/mcp/health`);
	}

	listMcpServers(): Observable<{ runtimes: McpServerRuntime[]; publicConfig: unknown[] }> {
		if (environment.enableMockAgents) {
			return of({ runtimes: [], publicConfig: [] });
		}
		return this.http.get<{ runtimes: McpServerRuntime[]; publicConfig: unknown[] }>(`${this.base()}/mcp/servers`);
	}

	startMcpServer(serverId: string): Observable<McpServerRuntime> {
		if (environment.enableMockAgents) {
			return throwError(() => new Error('MCP requires live API'));
		}
		return this.http.post<McpServerRuntime>(
			`${this.base()}/mcp/servers/${encodeURIComponent(serverId)}/start`,
			{},
		);
	}

	stopMcpServer(serverId: string): Observable<{ ok: boolean }> {
		if (environment.enableMockAgents) {
			return throwError(() => new Error('MCP requires live API'));
		}
		return this.http.post<{ ok: boolean }>(`${this.base()}/mcp/servers/${encodeURIComponent(serverId)}/stop`, {});
	}

	discoverMcpTools(serverId: string): Observable<McpToolDefinition[]> {
		if (environment.enableMockAgents) {
			return of([]);
		}
		return this.http.post<McpToolDefinition[]>(
			`${this.base()}/mcp/servers/${encodeURIComponent(serverId)}/discover`,
			{},
		);
	}

	listMcpTools(): Observable<McpToolDefinition[]> {
		if (environment.enableMockAgents) {
			return of([]);
		}
		return this.http.get<McpToolDefinition[]>(`${this.base()}/mcp/tools`);
	}

	callMcpTool(request: {
		serverId: string;
		toolName: string;
		input?: Record<string, unknown>;
	}): Observable<McpToolCallResult> {
		if (environment.enableMockAgents) {
			return throwError(() => new Error('MCP requires live API'));
		}
		return this.http.post<McpToolCallResult>(`${this.base()}/mcp/tools/call`, request);
	}
}
