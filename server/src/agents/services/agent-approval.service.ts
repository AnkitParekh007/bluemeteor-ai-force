import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthUser } from '../../auth/models/auth-user.model';
import { isoNow } from '../../common/utils/dates';
import { newId } from '../../common/utils/ids';
import type { AgentApprovalRequest } from '../models/agent-run.model';
import { AgentConfigRegistryService } from './agent-config-registry.service';
import { AgentRunService } from './agent-run.service';

export interface CreateApprovalInput {
	readonly title: string;
	readonly description: string;
	readonly riskLevel: AgentApprovalRequest['riskLevel'];
	readonly actionType: string;
	readonly payload?: Record<string, unknown>;
}

@Injectable()
export class AgentApprovalService {
	constructor(
		private readonly runs: AgentRunService,
		private readonly registry: AgentConfigRegistryService,
	) {}

	async createApproval(
		runId: string,
		input: CreateApprovalInput,
		requestedByUserId?: string,
	): Promise<AgentApprovalRequest> {
		await this.runs.getRun(runId);
		const a: AgentApprovalRequest = {
			id: newId('appr'),
			runId,
			title: input.title,
			description: input.description,
			riskLevel: input.riskLevel,
			actionType: input.actionType,
			payload: input.payload ?? {},
			status: 'pending',
			createdAt: isoNow(),
			requestedByUserId,
		};
		await this.runs.addApproval(runId, a);
		return a;
	}

	async listApprovals(runId: string): Promise<AgentApprovalRequest[]> {
		return (await this.runs.getRun(runId)).approvals;
	}

	async submitDecision(
		runId: string,
		approvalId: string,
		decision: 'approved' | 'rejected',
		resolver: AuthUser,
	): Promise<void> {
		const run = await this.runs.getRun(runId);
		const found = run.approvals.find((a) => a.id === approvalId);
		if (!found) throw new NotFoundException(`Approval ${approvalId} not found`);
		if (found.status !== 'pending') {
			throw new ForbiddenException('Approval already resolved');
		}
		const canApprove =
			resolver.permissions.includes('system.admin') || resolver.permissions.includes('tools.approve');
		if (!canApprove) throw new ForbiddenException('Missing tools.approve');

		if (decision === 'approved') {
			const risky = found.riskLevel === 'high' || found.riskLevel === 'critical';
			if (
				risky &&
				found.requestedByUserId &&
				found.requestedByUserId === resolver.id &&
				!resolver.permissions.includes('system.admin')
			) {
				throw new ForbiddenException('Cannot approve your own high-risk action');
			}
		}

		await this.runs.resolveApproval(runId, approvalId, decision, {
			userId: resolver.id,
			email: resolver.email,
		});
	}

	async hasPendingApproval(runId: string): Promise<boolean> {
		return (await this.runs.getRun(runId)).approvals.some((a) => a.status === 'pending');
	}

	detectRiskyAction(agentSlug: string, message: string): CreateApprovalInput | null {
		const m = message.toLowerCase();
		if (agentSlug === 'dato' && /\b(execute|run)\s+(the\s+)?query\b|\bproduction\b.*\bdata\b/i.test(m)) {
			if (this.registry.requiresApproval(agentSlug, 'database_query_execute')) {
				return {
					title: 'Database query execution',
					description: 'Message asks to execute queries possibly against production data.',
					riskLevel: 'high',
					actionType: 'database_query_execute',
					payload: { hint: 'dato' },
				};
			}
		}
		if (agentSlug === 'devopsy' && /\bdeploy\b|\bproduction\b|\binfra\b.*\b(change|modify)\b/i.test(m)) {
			if (/\bdeploy\b/.test(m) && this.registry.requiresApproval(agentSlug, 'deploy')) {
				return {
					title: 'Production deploy',
					description: 'Deploy or production change requested.',
					riskLevel: 'critical',
					actionType: 'deploy',
					payload: {},
				};
			}
		}
		if (agentSlug === 'testo' && /\breal\s+browser\b|\bplaywright\s+live\b|\bexecute\s+real\b/i.test(m)) {
			return {
				title: 'Real browser execution',
				description: 'Live browser automation requires approval.',
				riskLevel: 'critical',
				actionType: 'browser_execute_real',
				payload: {},
			};
		}
		if (agentSlug === 'supporto' && /\bcustomer\s+(record|data|pii)\b|\bview\s+account\b/i.test(m)) {
			return {
				title: 'Customer data access',
				description: 'Access to customer PII or account systems.',
				riskLevel: 'high',
				actionType: 'customer_data_access',
				payload: {},
			};
		}
		if (agentSlug === 'backo' && /\bmigration\b|\bddl\b|\balter\s+table\b/i.test(m)) {
			return {
				title: 'Schema migration',
				description: 'DDL or migration-style change mentioned.',
				riskLevel: 'high',
				actionType: 'schema_migration',
				payload: {},
			};
		}
		return null;
	}
}
