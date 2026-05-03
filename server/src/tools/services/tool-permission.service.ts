import { Inject, Injectable, Optional, forwardRef } from '@nestjs/common';

import { AgentSkillPackRegistryService } from '../../agent-intelligence/services/agent-skill-pack-registry.service';
import { AppConfigService } from '../../config/app-config.service';
import { AgentConfigRegistryService } from '../../agents/services/agent-config-registry.service';
import type { AgentWorkspaceMode } from '../../agents/models/agent-session.model';
import type { AuthUser } from '../../auth/models/auth-user.model';
import { RbacService } from '../../auth/services/rbac.service';
import { McpAdapterService } from '../../internal-tools/services/mcp-adapter.service';
import type { ToolRiskLevel } from '../models/tool-definition.model';
import { ToolRegistryService } from './tool-registry.service';

export interface ToolPermissionDecision {
	readonly allowed: boolean;
	readonly requiresApproval: boolean;
	readonly riskLevel: ToolRiskLevel;
	readonly reason?: string;
	readonly missingPermissions?: string[];
}

@Injectable()
export class ToolPermissionService {
	constructor(
		private readonly registry: AgentConfigRegistryService,
		private readonly tools: ToolRegistryService,
		private readonly appConfig: AppConfigService,
		private readonly rbac: RbacService,
		private readonly mcpAdapter: McpAdapterService,
		@Optional()
		@Inject(forwardRef(() => AgentSkillPackRegistryService))
		private readonly skillPacks: AgentSkillPackRegistryService | undefined,
	) {}

	canUseTool(agentSlug: string, toolId: string): boolean {
		const c = this.registry.getConfig(agentSlug);
		if (!c) return false;
		if (c.deniedTools.includes(toolId)) return false;
		const staticPerm = c.allowedTools.find((t) => t.toolId === toolId);
		if (staticPerm?.enabled) return true;
		return this.skillPacks?.isToolAllowedBySkillPackSync(agentSlug, toolId) ?? false;
	}

	requiresApproval(agentSlug: string, toolId: string): boolean {
		if (this.registry.requiresApproval(agentSlug, toolId)) return true;
		const c = this.registry.getConfig(agentSlug);
		const staticPerm = c?.allowedTools.find((t) => t.toolId === toolId);
		if (staticPerm) return false;
		if (this.skillPacks?.isToolAllowedBySkillPackSync(agentSlug, toolId)) {
			return this.tools.getTool(toolId)?.requiresApproval ?? false;
		}
		return false;
	}

	getRiskLevel(agentSlug: string, toolId: string): ToolRiskLevel {
		const def = this.tools.getTool(toolId);
		const cfg = this.registry.getConfig(agentSlug);
		const perm = cfg?.allowedTools.find((t) => t.toolId === toolId);
		if (perm?.riskLevel) return perm.riskLevel as ToolRiskLevel;
		return def?.riskLevel ?? 'low';
	}

	isToolBlocked(agentSlug: string, toolId: string): boolean {
		const def = this.tools.getTool(toolId);
		if (!def || !def.enabled) return true;
		if (!this.canUseTool(agentSlug, toolId)) return true;
		if (def.riskLevel === 'critical' && (toolId === 'deploy' || toolId === 'database_execute')) return true;
		return false;
	}

	validateToolInput(toolId: string, input: Record<string, unknown>): { ok: boolean; reason?: string } {
		if (toolId.startsWith('browser_')) {
			if (toolId === 'browser_open_url') {
				const url = input['url'];
				if (typeof url !== 'string' || !url.trim()) return { ok: false, reason: 'url required' };
			}
			if (toolId === 'browser_click' || toolId === 'browser_fill' || toolId === 'browser_press') {
				const sel = input['selector'];
				if (typeof sel !== 'string' || !sel.trim()) return { ok: false, reason: 'selector required' };
			}
			if (toolId === 'browser_profile_create') {
				const n = input['name'];
				if (typeof n !== 'string' || !n.trim()) return { ok: false, reason: 'name required' };
			}
			if (toolId === 'browser_auth_capture_start') {
				if (typeof input['sessionId'] !== 'string' || !String(input['sessionId']).trim()) {
					return { ok: false, reason: 'sessionId required' };
				}
				if (typeof input['agentSlug'] !== 'string' || !String(input['agentSlug']).trim()) {
					return { ok: false, reason: 'agentSlug required' };
				}
			}
			if (toolId === 'browser_auth_capture_complete') {
				const id = input['captureId'];
				if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'captureId required' };
			}
			if (toolId === 'browser_open_authenticated') {
				const url = input['url'];
				if (typeof url !== 'string' || !url.trim()) return { ok: false, reason: 'url required' };
				const pid = input['profileId'];
				if (typeof pid !== 'string' || !pid.trim()) return { ok: false, reason: 'profileId required' };
			}
		}
		if (toolId.startsWith('playwright_')) {
			if (toolId === 'playwright_generate_from_template' || toolId === 'playwright_run_template') {
				const k = input['templateKey'];
				if (typeof k !== 'string' || !k.trim()) return { ok: false, reason: 'templateKey required' };
			}
			if (toolId === 'playwright_validate_spec' || toolId === 'playwright_run_validated_spec') {
				const id = input['specId'];
				if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'specId required' };
			}
			if (toolId === 'playwright_generate_spec') {
				const t = input['title'];
				if (typeof t !== 'string' || !t.trim()) return { ok: false, reason: 'title required' };
			}
			if (toolId === 'playwright_list_runs' || toolId === 'playwright_get_run') {
				const sid = input['sessionId'];
				const rid = input['testRunId'];
				if (toolId === 'playwright_list_runs' && (typeof sid !== 'string' || !sid.trim())) {
					return { ok: false, reason: 'sessionId required' };
				}
				if (toolId === 'playwright_get_run' && (typeof rid !== 'string' || !rid.trim())) {
					return { ok: false, reason: 'testRunId required' };
				}
			}
		}
		if (toolId === 'repository_read_file' || toolId === 'docs_read' || toolId === 'cicd_read_file') {
			const p = input['path'];
			if (typeof p !== 'string' || !p.trim()) return { ok: false, reason: 'path required' };
		}
		if (
			toolId === 'repository_search_text' ||
			toolId === 'docs_search' ||
			toolId === 'tickets_search' ||
			toolId === 'api_catalog_search' ||
			toolId === 'db_schema_search'
		) {
			const q = input['query'];
			if (typeof q !== 'string' || !q.trim()) return { ok: false, reason: 'query required' };
		}
		if (toolId === 'tickets_get') {
			const id = input['ticketId'] ?? input['id'];
			if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'ticketId required' };
		}
		if (toolId === 'api_catalog_get') {
			const id = input['endpointId'] ?? input['id'];
			if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'endpointId required' };
		}
		if (toolId === 'db_schema_get_table') {
			const n = input['tableName'] ?? input['name'];
			if (typeof n !== 'string' || !n.trim()) return { ok: false, reason: 'tableName required' };
		}
		if (toolId === 'mcp_discover_tools' || toolId === 'mcp_start_server' || toolId === 'mcp_stop_server') {
			const sid = input['serverId'];
			if (typeof sid !== 'string' || !sid.trim()) return { ok: false, reason: 'serverId required' };
		}
		if (toolId === 'mcp_call_tool') {
			const sid = input['serverId'];
			const tn = input['toolName'];
			if (typeof sid !== 'string' || !sid.trim()) return { ok: false, reason: 'serverId required' };
			if (typeof tn !== 'string' || !tn.trim()) return { ok: false, reason: 'toolName required' };
		}
		if (toolId === 'connector_repo_read_file' || toolId === 'connector_cicd_read_file') {
			const p = input['path'];
			if (typeof p !== 'string' || !p.trim()) return { ok: false, reason: 'path required' };
		}
		if (toolId === 'connector_repo_search' || toolId === 'connector_jira_search' || toolId === 'connector_confluence_search') {
			const q = input['query'] ?? input['jql'];
			if (typeof q !== 'string' || !q.trim()) return { ok: false, reason: 'query required' };
		}
		if (toolId === 'connector_jira_get_issue') {
			const k = input['issueKey'] ?? input['key'];
			if (typeof k !== 'string' || !k.trim()) return { ok: false, reason: 'issueKey required' };
		}
		if (toolId === 'connector_support_get_ticket') {
			const id = input['ticketId'] ?? input['id'];
			if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'ticketId required' };
		}
		if (toolId === 'connector_confluence_get_page') {
			const pid = input['pageId'];
			if (typeof pid !== 'string' || !pid.trim()) return { ok: false, reason: 'pageId required' };
		}
		if (toolId === 'connector_repo_pull_requests' || toolId === 'connector_repo_commits') {
			const slug = input['repoSlug'];
			if (typeof slug !== 'string' || !slug.trim()) return { ok: false, reason: 'repoSlug required' };
		}
		return { ok: true };
	}

	decide(
		agentSlug: string,
		toolId: string,
		mode: AgentWorkspaceMode,
		authUser?: AuthUser | null,
	): ToolPermissionDecision {
		const base = this.decidePolicy(agentSlug, toolId, mode);
		if (!base.allowed || !this.appConfig.enableRbac || !authUser) {
			return base;
		}
		const missing: string[] = [];

		if (mode === 'act' && !this.rbac.hasPermissionSync(authUser, 'agents.act')) {
			return {
				allowed: false,
				requiresApproval: false,
				riskLevel: base.riskLevel,
				reason: 'rbac_act_mode',
				missingPermissions: ['agents.act'],
			};
		}

		const risk = base.riskLevel;
		const execPerm =
			risk === 'low'
				? 'tools.execute.low'
				: risk === 'medium'
					? 'tools.execute.medium'
					: 'tools.execute.high';
		if (!this.rbac.hasPermissionSync(authUser, execPerm)) {
			missing.push(execPerm);
		}

		const browserPerms = [...this.browserPermissionsForTool(toolId), ...this.playwrightToolPermissions(toolId)];
		for (const p of browserPerms) {
			if (!this.rbac.hasPermissionSync(authUser, p)) missing.push(p);
		}

		const dataPerms = this.dataPermissionsForTool(toolId);
		for (const p of dataPerms) {
			if (!this.rbac.hasPermissionSync(authUser, p)) missing.push(p);
		}

		if (!this.rbac.canAccessAgent(authUser, agentSlug, mode === 'act' ? 'act' : 'use')) {
			return {
				allowed: false,
				requiresApproval: false,
				riskLevel: base.riskLevel,
				reason: 'rbac_agent_access',
				missingPermissions: [...new Set(missing)],
			};
		}

		if (missing.length > 0) {
			return {
				allowed: false,
				requiresApproval: false,
				riskLevel: base.riskLevel,
				reason: 'rbac_permission',
				missingPermissions: [...new Set(missing)],
			};
		}

		return { ...base, missingPermissions: [] };
	}

	private decidePolicy(agentSlug: string, toolId: string, mode: AgentWorkspaceMode): ToolPermissionDecision {
		const def = this.tools.getTool(toolId);
		if (!def) {
			return { allowed: false, requiresApproval: false, riskLevel: 'low', reason: 'unknown_tool' };
		}
		if (toolId === 'mcp_call_tool' && !this.mcpAdapter.canAgentInvokeMcpTool(agentSlug, toolId)) {
			return {
				allowed: false,
				requiresApproval: false,
				riskLevel: 'medium',
				reason: 'mcp_call_agent_not_allowed',
			};
		}
		if (!def.enabled) {
			return { allowed: false, requiresApproval: false, riskLevel: def.riskLevel, reason: 'tool_disabled' };
		}
		if (!this.canUseTool(agentSlug, toolId)) {
			return { allowed: false, requiresApproval: false, riskLevel: def.riskLevel, reason: 'agent_denied' };
		}
		if (!def.allowedInModes.includes(mode)) {
			return { allowed: false, requiresApproval: false, riskLevel: def.riskLevel, reason: 'mode_not_allowed' };
		}
		if (this.isToolBlocked(agentSlug, toolId)) {
			return { allowed: false, requiresApproval: false, riskLevel: def.riskLevel, reason: 'blocked_by_policy' };
		}

		const risk = this.getRiskLevel(agentSlug, toolId);
		let requiresApproval = def.requiresApproval || this.requiresApproval(agentSlug, toolId);
		if (toolId.startsWith('connector_')) {
			requiresApproval = false;
		}

		if (this.appConfig.enableToolApprovals) {
			if (risk === 'critical') {
				requiresApproval = true;
				if (this.appConfig.blockHighRiskToolsWithoutApproval && (toolId === 'deploy' || toolId === 'database_execute')) {
					return { allowed: false, requiresApproval: true, riskLevel: risk, reason: 'critical_blocked' };
				}
			}
			if (risk === 'high') {
				requiresApproval = true;
			}
			if (risk === 'medium') {
				requiresApproval = true;
			}
			if (risk === 'low' && this.appConfig.autoApproveLowRiskTools) {
				requiresApproval = requiresApproval && def.requiresApproval;
			}
		} else {
			requiresApproval = false;
		}

		if (this.appConfig.requireApprovalForAuthBrowser) {
			const authTools = [
				'browser_auth_capture_start',
				'browser_auth_capture_complete',
				'browser_create_demo_auth_profile',
				'browser_open_authenticated',
			];
			if (authTools.includes(toolId)) requiresApproval = true;
		}
		if (this.appConfig.requireApprovalForRealTestRun && toolId === 'playwright_run_template') {
			requiresApproval = true;
		}
		if (toolId === 'playwright_run_validated_spec') {
			requiresApproval = true;
		}

		return { allowed: true, requiresApproval, riskLevel: risk };
	}

	private browserPermissionsForTool(toolId: string): string[] {
		if (!toolId.startsWith('browser_')) return [];
		if (toolId === 'browser_open_url') return ['browser.open'];
		if (toolId === 'browser_click' || toolId === 'browser_press') return ['browser.action.click'];
		if (toolId === 'browser_fill') return ['browser.action.fill'];
		if (toolId.includes('screenshot')) return ['browser.screenshot'];
		if (toolId.includes('inspect') || toolId.includes('dom')) return ['browser.inspect'];
		if (toolId === 'browser_profile_list') return ['browser.view'];
		if (
			toolId === 'browser_profile_create' ||
			toolId.startsWith('browser_auth') ||
			toolId === 'browser_create_demo_auth_profile' ||
			toolId === 'browser_open_authenticated'
		) {
			return ['browser.open'];
		}
		return ['browser.view'];
	}

	private playwrightToolPermissions(toolId: string): string[] {
		if (!toolId.startsWith('playwright_')) return [];
		if (toolId === 'playwright_run_validated_spec') return ['tools.execute.high'];
		if (toolId === 'playwright_run_template' || toolId === 'playwright_validate_spec') return ['tools.execute.medium'];
		return ['tools.execute.low'];
	}

	private dataPermissionsForTool(toolId: string): string[] {
		if (toolId.includes('sql') || toolId.includes('database')) return ['data.sql.generate'];
		if (toolId.startsWith('db_schema_')) return ['data.sql.generate'];
		return [];
	}
}
