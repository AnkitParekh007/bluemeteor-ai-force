import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
	AgentEvaluationCase,
	AgentEvaluationRun,
	AgentPromptTemplate,
	AgentSkillPack,
	AgentWorkflowTemplate,
} from '../models/agent-intelligence.models';
import type { ConnectorDefinition, ConnectorHealth } from '../models/connector.models';
import type { ToolDefinition } from '../models/tool-definition.models';
import { AgentApiService } from './agent-api.service';
import { AgentIntelligenceApiService } from './agent-intelligence-api.service';
import { AuthApiService } from './auth-api.service';
import { AuthTokenService } from './auth-token.service';
import { ConnectorApiService } from './connector-api.service';
import { OpsApiService } from './ops-api.service';

/** Aggregated admin summary from `GET /admin/summary` (safe fields only). */
export type AdminSummaryDto = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AdminApiService {
	private readonly http = inject(HttpClient);
	private readonly tokens = inject(AuthTokenService);
	private readonly authApi = inject(AuthApiService);
	private readonly ops = inject(OpsApiService);
	private readonly intel = inject(AgentIntelligenceApiService);
	private readonly connectors = inject(ConnectorApiService);
	private readonly agentApi = inject(AgentApiService);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	private headers() {
		return this.tokens.getAuthHeader();
	}

	getAdminSummary(): Observable<AdminSummaryDto> {
		return this.http.get<AdminSummaryDto>(`${this.base()}/admin/summary`, { headers: this.headers() });
	}

	getPlatformSummary(): Observable<AdminSummaryDto> {
		return this.http.get<AdminSummaryDto>(`${this.base()}/admin/platform/summary`, { headers: this.headers() });
	}

	getAgentsAdminSummary(): Observable<Record<string, unknown>> {
		return this.http.get<Record<string, unknown>>(`${this.base()}/admin/agents/summary`, {
			headers: this.headers(),
		});
	}

	listAdminApprovals(params?: { status?: string; limit?: number }): Observable<unknown[]> {
		const q = new URLSearchParams();
		if (params?.status) q.set('status', params.status);
		if (params?.limit != null) q.set('limit', String(params.limit));
		const suffix = q.toString() ? `?${q}` : '';
		return this.http.get<unknown[]>(`${this.base()}/admin/approvals${suffix}`, { headers: this.headers() });
	}

	getUsers() {
		return this.authApi.listUsers();
	}

	getTools(): Observable<ToolDefinition[]> {
		return this.http.get<ToolDefinition[]>(`${this.base()}/tools`, { headers: this.headers() });
	}

	getTool(toolId: string): Observable<ToolDefinition> {
		return this.http.get<ToolDefinition>(`${this.base()}/tools/${encodeURIComponent(toolId)}`, {
			headers: this.headers(),
		});
	}

	listConnectorDefinitions(): Observable<ConnectorDefinition[]> {
		return this.connectors.listConnectors();
	}

	getConnectorHealth(): Observable<ConnectorHealth[]> {
		return this.connectors.getConnectorHealth();
	}

	refreshConnectorHealth(connectorId: string): Observable<ConnectorHealth> {
		return this.connectors.refreshConnectorHealth(connectorId);
	}

	getMcpServers() {
		return this.agentApi.listMcpServers();
	}

	getMcpHealth() {
		return this.agentApi.getMcpHealth();
	}

	listMcpTools() {
		return this.agentApi.listMcpTools();
	}

	getPromptTemplates(agentSlug?: string): Observable<AgentPromptTemplate[]> {
		return this.intel.listPromptTemplates(agentSlug);
	}

	getSkillPacks(agentSlug?: string): Observable<AgentSkillPack[]> {
		return this.intel.listSkillPacks(agentSlug);
	}

	getWorkflows(agentSlug?: string): Observable<AgentWorkflowTemplate[]> {
		return this.intel.listWorkflows(agentSlug);
	}

	getEvaluationRuns(agentSlug?: string): Observable<AgentEvaluationRun[]> {
		return this.intel.listEvaluationRuns(agentSlug);
	}

	getEvaluationRun(runId: string): Observable<AgentEvaluationRun> {
		return this.intel.getEvaluationRun(runId);
	}

	listEvaluationCases(agentSlug?: string): Observable<AgentEvaluationCase[]> {
		return this.intel.listEvaluationCases(agentSlug);
	}

	runEvaluation(body: Parameters<AgentIntelligenceApiService['runEvaluation']>[0]) {
		return this.intel.runEvaluation(body);
	}

	getApprovals(params?: { status?: string; limit?: number }) {
		return this.listAdminApprovals(params);
	}

	getAuditLogs(
		limit?: number,
		filters?: {
			readonly action?: string;
			readonly agentSlug?: string;
			readonly runId?: string;
			readonly actorEmail?: string;
		},
	) {
		return this.authApi.listAuditLogs(limit ?? 200, filters);
	}

	getOpsHealth() {
		return this.ops.getHealth();
	}

	getOpsReadiness() {
		return this.ops.getReadiness();
	}

	getOpsMetrics() {
		return this.ops.getMetrics();
	}

	getSecurityHealth() {
		return this.ops.getSecurityHealth();
	}

	getReadiness(agentSlug: string) {
		return this.intel.getReadiness(agentSlug);
	}
}
