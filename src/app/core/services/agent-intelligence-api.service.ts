import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
	AgentEvaluationCase,
	AgentEvaluationRun,
	AgentIntelligenceReadinessRow,
	AgentPromptTemplate,
	AgentPromptTemplateType,
	AgentSkillPack,
	AgentWorkflowTemplate,
} from '../models/agent-intelligence.models';

@Injectable({ providedIn: 'root' })
export class AgentIntelligenceApiService {
	private readonly http = inject(HttpClient);

	private base(): string {
		return environment.agentApiBaseUrl.replace(/\/$/, '');
	}

	listPromptTemplates(agentSlug?: string): Observable<AgentPromptTemplate[]> {
		if (environment.enableMockAgents) return of([]);
		const q = agentSlug ? `?agentSlug=${encodeURIComponent(agentSlug)}` : '';
		return this.http.get<AgentPromptTemplate[]>(`${this.base()}/agent-intelligence/prompts${q}`);
	}

	getPromptTemplate(id: string): Observable<AgentPromptTemplate | null> {
		if (environment.enableMockAgents) return of(null);
		return this.http.get<AgentPromptTemplate | null>(`${this.base()}/agent-intelligence/prompts/${encodeURIComponent(id)}`);
	}

	renderPrompt(body: {
		agentSlug: string;
		templateType: AgentPromptTemplateType;
		variables: Record<string, unknown>;
	}): Observable<{ templateId: string; version: string; content: string; missingVariables: string[] }> {
		if (environment.enableMockAgents) {
			return of({ templateId: '', version: '', content: '', missingVariables: [] });
		}
		return this.http.post<{
			templateId: string;
			version: string;
			content: string;
			missingVariables: string[];
		}>(`${this.base()}/agent-intelligence/prompts/render`, body);
	}

	listSkillPacks(agentSlug?: string): Observable<AgentSkillPack[]> {
		if (environment.enableMockAgents) return of([]);
		const q = agentSlug ? `?agentSlug=${encodeURIComponent(agentSlug)}` : '';
		return this.http.get<AgentSkillPack[]>(`${this.base()}/agent-intelligence/skill-packs${q}`);
	}

	listWorkflows(agentSlug?: string): Observable<AgentWorkflowTemplate[]> {
		if (environment.enableMockAgents) return of([]);
		const q = agentSlug ? `?agentSlug=${encodeURIComponent(agentSlug)}` : '';
		return this.http.get<AgentWorkflowTemplate[]>(`${this.base()}/agent-intelligence/workflows${q}`);
	}

	matchWorkflow(body: { agentSlug: string; message: string; mode: 'ask' | 'plan' | 'act' }): Observable<AgentWorkflowTemplate | null> {
		if (environment.enableMockAgents) return of(null);
		return this.http.post<AgentWorkflowTemplate | null>(`${this.base()}/agent-intelligence/workflows/match`, body);
	}

	listEvaluationCases(agentSlug?: string): Observable<AgentEvaluationCase[]> {
		if (environment.enableMockAgents) return of([]);
		const q = agentSlug ? `?agentSlug=${encodeURIComponent(agentSlug)}` : '';
		return this.http.get<AgentEvaluationCase[]>(`${this.base()}/agent-intelligence/evaluations/cases${q}`);
	}

	runEvaluation(body: {
		agentSlug: string;
		options?: { allowBrowserAndTestTools?: boolean; useRealProvider?: boolean };
	}): Observable<AgentEvaluationRun> {
		if (environment.enableMockAgents) {
			return of({
				id: 'mock',
				agentSlug: body.agentSlug,
				status: 'completed',
				totalCases: 0,
				passedCases: 0,
				failedCases: 0,
				score: 0,
				startedAt: new Date().toISOString(),
				results: [],
			});
		}
		return this.http.post<AgentEvaluationRun>(`${this.base()}/agent-intelligence/evaluations/run`, body);
	}

	listEvaluationRuns(agentSlug?: string): Observable<AgentEvaluationRun[]> {
		if (environment.enableMockAgents) return of([]);
		const q = agentSlug ? `?agentSlug=${encodeURIComponent(agentSlug)}` : '';
		return this.http.get<AgentEvaluationRun[]>(`${this.base()}/agent-intelligence/evaluations/runs${q}`);
	}

	getEvaluationRun(runId: string): Observable<AgentEvaluationRun> {
		if (environment.enableMockAgents) {
			return of({
				id: runId,
				agentSlug: 'mock',
				status: 'completed',
				totalCases: 0,
				passedCases: 0,
				failedCases: 0,
				score: 0,
				startedAt: new Date().toISOString(),
				results: [],
			});
		}
		return this.http.get<AgentEvaluationRun>(
			`${this.base()}/agent-intelligence/evaluations/runs/${encodeURIComponent(runId)}`,
		);
	}

	getReadiness(agentSlug: string): Observable<AgentIntelligenceReadinessRow> {
		if (environment.enableMockAgents) {
			return of({
				agentSlug,
				prompts: 0,
				skillPacks: 0,
				workflows: 0,
				evalCases: 0,
				latestEvaluation: null,
			});
		}
		return this.http.get<AgentIntelligenceReadinessRow>(
			`${this.base()}/agent-intelligence/evaluations/readiness/${encodeURIComponent(agentSlug)}`,
		);
	}

	createPromptTemplate(body: Record<string, unknown>): Observable<AgentPromptTemplate> {
		if (environment.enableMockAgents) return of({} as AgentPromptTemplate);
		return this.http.post<AgentPromptTemplate>(`${this.base()}/agent-intelligence/prompts`, body);
	}

	updatePromptTemplate(id: string, body: Record<string, unknown>): Observable<AgentPromptTemplate> {
		if (environment.enableMockAgents) return of({} as AgentPromptTemplate);
		return this.http.patch<AgentPromptTemplate>(
			`${this.base()}/agent-intelligence/prompts/${encodeURIComponent(id)}`,
			body,
		);
	}

	activatePromptTemplate(id: string): Observable<AgentPromptTemplate> {
		if (environment.enableMockAgents) return of({} as AgentPromptTemplate);
		return this.http.post<AgentPromptTemplate>(
			`${this.base()}/agent-intelligence/prompts/${encodeURIComponent(id)}/activate`,
			{},
		);
	}

	archivePromptTemplate(id: string): Observable<AgentPromptTemplate> {
		if (environment.enableMockAgents) return of({} as AgentPromptTemplate);
		return this.http.post<AgentPromptTemplate>(
			`${this.base()}/agent-intelligence/prompts/${encodeURIComponent(id)}/archive`,
			{},
		);
	}

	createSkillPack(body: Record<string, unknown>): Observable<AgentSkillPack> {
		if (environment.enableMockAgents) return of({} as AgentSkillPack);
		return this.http.post<AgentSkillPack>(`${this.base()}/agent-intelligence/skill-packs`, body);
	}

	updateSkillPack(id: string, body: Record<string, unknown>): Observable<AgentSkillPack> {
		if (environment.enableMockAgents) return of({} as AgentSkillPack);
		return this.http.patch<AgentSkillPack>(
			`${this.base()}/agent-intelligence/skill-packs/${encodeURIComponent(id)}`,
			body,
		);
	}

	activateSkillPack(id: string): Observable<AgentSkillPack> {
		if (environment.enableMockAgents) return of({} as AgentSkillPack);
		return this.http.post<AgentSkillPack>(
			`${this.base()}/agent-intelligence/skill-packs/${encodeURIComponent(id)}/activate`,
			{},
		);
	}

	disableSkillPack(id: string): Observable<AgentSkillPack> {
		if (environment.enableMockAgents) return of({} as AgentSkillPack);
		return this.http.post<AgentSkillPack>(
			`${this.base()}/agent-intelligence/skill-packs/${encodeURIComponent(id)}/disable`,
			{},
		);
	}

	createWorkflow(body: Record<string, unknown>): Observable<AgentWorkflowTemplate> {
		if (environment.enableMockAgents) return of({} as AgentWorkflowTemplate);
		return this.http.post<AgentWorkflowTemplate>(`${this.base()}/agent-intelligence/workflows`, body);
	}

	updateWorkflow(id: string, body: Record<string, unknown>): Observable<AgentWorkflowTemplate> {
		if (environment.enableMockAgents) return of({} as AgentWorkflowTemplate);
		return this.http.patch<AgentWorkflowTemplate>(
			`${this.base()}/agent-intelligence/workflows/${encodeURIComponent(id)}`,
			body,
		);
	}

	activateWorkflow(id: string): Observable<AgentWorkflowTemplate> {
		if (environment.enableMockAgents) return of({} as AgentWorkflowTemplate);
		return this.http.post<AgentWorkflowTemplate>(
			`${this.base()}/agent-intelligence/workflows/${encodeURIComponent(id)}/activate`,
			{},
		);
	}

	disableWorkflow(id: string): Observable<AgentWorkflowTemplate> {
		if (environment.enableMockAgents) return of({} as AgentWorkflowTemplate);
		return this.http.post<AgentWorkflowTemplate>(
			`${this.base()}/agent-intelligence/workflows/${encodeURIComponent(id)}/disable`,
			{},
		);
	}

	runSingleEvaluationCase(
		caseId: string,
		options?: { allowBrowserAndTestTools?: boolean; useRealProvider?: boolean },
	): Observable<AgentEvaluationRun> {
		if (environment.enableMockAgents) {
			return of({
				id: 'mock',
				agentSlug: 'mock',
				status: 'completed',
				totalCases: 1,
				passedCases: 1,
				failedCases: 0,
				score: 1,
				startedAt: new Date().toISOString(),
				results: [],
			});
		}
		return this.http.post<AgentEvaluationRun>(
			`${this.base()}/agent-intelligence/evaluations/cases/${encodeURIComponent(caseId)}/run`,
			{ options: options ?? {} },
		);
	}

	createEvaluationCase(body: Record<string, unknown>): Observable<AgentEvaluationCase> {
		if (environment.enableMockAgents) return of({} as AgentEvaluationCase);
		return this.http.post<AgentEvaluationCase>(`${this.base()}/agent-intelligence/evaluations/cases`, body);
	}

	updateEvaluationCase(id: string, body: Record<string, unknown>): Observable<AgentEvaluationCase> {
		if (environment.enableMockAgents) return of({} as AgentEvaluationCase);
		return this.http.patch<AgentEvaluationCase>(
			`${this.base()}/agent-intelligence/evaluations/cases/${encodeURIComponent(id)}`,
			body,
		);
	}
}
