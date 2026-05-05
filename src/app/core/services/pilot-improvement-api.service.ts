import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
	AgentImprovementBacklogItem,
	AgentQualitySnapshot,
	BacklogStats,
	FeedbackTriageCategory,
	FeedbackSeverity,
	FeedbackTriageStatus,
	ImprovementCategory,
	ImprovementPriority,
	ImprovementStatus,
	ImprovementReport,
	PilotFeedbackTriage,
	RegressionSummary,
	TriageStats,
} from '../models/pilot-improvement.models';

const BASE = `${environment.agentApiBaseUrl.replace(/\/$/, '')}/pilot-improvement`;

@Injectable({ providedIn: 'root' })
export class PilotImprovementApiService {
	private readonly http = inject(HttpClient);

	// ——— Triage ———

	listTriage(filters?: {
		agentSlug?: string;
		category?: FeedbackTriageCategory;
		severity?: FeedbackSeverity;
		status?: FeedbackTriageStatus;
		from?: string;
		to?: string;
	}): Promise<PilotFeedbackTriage[]> {
		let params = new HttpParams();
		if (filters?.agentSlug) params = params.set('agentSlug', filters.agentSlug);
		if (filters?.category) params = params.set('category', filters.category);
		if (filters?.severity) params = params.set('severity', filters.severity);
		if (filters?.status) params = params.set('status', filters.status);
		if (filters?.from) params = params.set('from', filters.from);
		if (filters?.to) params = params.set('to', filters.to);
		return firstValueFrom(this.http.get<PilotFeedbackTriage[]>(`${BASE}/triage`, { params }));
	}

	runTriage(): Promise<{ triaged: number; skipped: number }> {
		return firstValueFrom(this.http.post<{ triaged: number; skipped: number }>(`${BASE}/triage/run`, {}));
	}

	triageFeedback(feedbackId: string): Promise<PilotFeedbackTriage> {
		return firstValueFrom(this.http.post<PilotFeedbackTriage>(`${BASE}/triage/${feedbackId}`, {}));
	}

	updateTriage(
		triageId: string,
		patch: Partial<Pick<PilotFeedbackTriage, 'category' | 'severity' | 'status' | 'summary' | 'rootCause' | 'recommendedAction' | 'assignedToUserId'>>,
	): Promise<PilotFeedbackTriage> {
		return firstValueFrom(this.http.patch<PilotFeedbackTriage>(`${BASE}/triage/${triageId}`, patch));
	}

	getTriageStats(): Promise<TriageStats> {
		return firstValueFrom(this.http.get<TriageStats>(`${BASE}/triage/stats`));
	}

	// ——— Backlog ———

	listBacklog(filters?: {
		agentSlug?: string;
		category?: ImprovementCategory;
		priority?: ImprovementPriority;
		status?: ImprovementStatus;
	}): Promise<AgentImprovementBacklogItem[]> {
		let params = new HttpParams();
		if (filters?.agentSlug) params = params.set('agentSlug', filters.agentSlug);
		if (filters?.category) params = params.set('category', filters.category);
		if (filters?.priority) params = params.set('priority', filters.priority);
		if (filters?.status) params = params.set('status', filters.status);
		return firstValueFrom(this.http.get<AgentImprovementBacklogItem[]>(`${BASE}/backlog`, { params }));
	}

	createBacklogItem(
		input: Pick<
			AgentImprovementBacklogItem,
			'agentSlug' | 'title' | 'description' | 'sourceType' | 'category' | 'priority'
		> & { expectedImpact?: string; sourceId?: string },
	): Promise<AgentImprovementBacklogItem> {
		return firstValueFrom(this.http.post<AgentImprovementBacklogItem>(`${BASE}/backlog`, input));
	}

	updateBacklogItem(id: string, patch: Partial<AgentImprovementBacklogItem>): Promise<AgentImprovementBacklogItem> {
		return firstValueFrom(this.http.patch<AgentImprovementBacklogItem>(`${BASE}/backlog/${id}`, patch));
	}

	acceptBacklogItem(id: string): Promise<AgentImprovementBacklogItem> {
		return firstValueFrom(this.http.post<AgentImprovementBacklogItem>(`${BASE}/backlog/${id}/accept`, {}));
	}

	rejectBacklogItem(id: string): Promise<AgentImprovementBacklogItem> {
		return firstValueFrom(this.http.post<AgentImprovementBacklogItem>(`${BASE}/backlog/${id}/reject`, {}));
	}

	markImplemented(id: string): Promise<AgentImprovementBacklogItem> {
		return firstValueFrom(this.http.post<AgentImprovementBacklogItem>(`${BASE}/backlog/${id}/implemented`, {}));
	}

	markValidated(id: string): Promise<AgentImprovementBacklogItem> {
		return firstValueFrom(this.http.post<AgentImprovementBacklogItem>(`${BASE}/backlog/${id}/validated`, {}));
	}

	closeBacklogItem(id: string): Promise<AgentImprovementBacklogItem> {
		return firstValueFrom(this.http.post<AgentImprovementBacklogItem>(`${BASE}/backlog/${id}/close`, {}));
	}

	getBacklogStats(): Promise<BacklogStats> {
		return firstValueFrom(this.http.get<BacklogStats>(`${BASE}/backlog/stats`));
	}

	// ——— Recommendations ———

	generateRecommendations(agentSlug?: string): Promise<AgentImprovementBacklogItem[]> {
		return firstValueFrom(
			this.http.post<AgentImprovementBacklogItem[]>(`${BASE}/recommendations/generate`, {
				agentSlug,
			}),
		);
	}

	generateFromTriage(triageId: string): Promise<AgentImprovementBacklogItem[]> {
		return firstValueFrom(
			this.http.post<AgentImprovementBacklogItem[]>(`${BASE}/recommendations/from-triage/${triageId}`, {}),
		);
	}

	generateFromFailedRuns(agentSlug: string): Promise<AgentImprovementBacklogItem[]> {
		return firstValueFrom(
			this.http.post<AgentImprovementBacklogItem[]>(`${BASE}/recommendations/failed-runs/${agentSlug}`, {}),
		);
	}

	generateFromEvalFailures(agentSlug: string): Promise<AgentImprovementBacklogItem[]> {
		return firstValueFrom(
			this.http.post<AgentImprovementBacklogItem[]>(`${BASE}/recommendations/evaluation-failures/${agentSlug}`, {}),
		);
	}

	// ——— Evaluation cases ———

	createEvaluationCaseFromFeedback(feedbackId: string): Promise<Record<string, unknown>> {
		return firstValueFrom(
			this.http.post<Record<string, unknown>>(`${BASE}/evaluation-case/from-feedback/${feedbackId}`, {}),
		);
	}

	createEvaluationCaseFromBacklog(backlogItemId: string): Promise<Record<string, unknown>> {
		return firstValueFrom(
			this.http.post<Record<string, unknown>>(`${BASE}/evaluation-case/from-backlog/${backlogItemId}`, {}),
		);
	}

	// ——— Regression ———

	getRegressionSummary(agentSlug: string): Promise<RegressionSummary> {
		return firstValueFrom(this.http.get<RegressionSummary>(`${BASE}/regression/${agentSlug}`));
	}

	// ——— Report ———

	getReport(): Promise<ImprovementReport> {
		return firstValueFrom(this.http.get<ImprovementReport>(`${BASE}/report`));
	}

	getReportMarkdown(): Promise<{ markdown: string }> {
		return firstValueFrom(this.http.get<{ markdown: string }>(`${BASE}/report/markdown`));
	}
}
