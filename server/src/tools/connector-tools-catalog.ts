import type { ToolDefinition } from './models/tool-definition.model';

const m = (modes: ToolDefinition['allowedInModes']): ToolDefinition['allowedInModes'] => modes;

/** Read-only connector hub tools — execution via ConnectorHubService. */
export const CONNECTOR_TOOLS: ToolDefinition[] = [
	{ id: 'connector_list', name: 'List connectors', description: 'Connector definitions and status', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_health', name: 'Connector health', description: 'Health check all connectors', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_repo_list', name: 'Repo list (connector)', description: 'List repositories via Bitbucket/GitHub or mock', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_repo_read_file', name: 'Repo read file (connector)', description: 'Read file from connected repo', category: 'connector', riskLevel: 'medium', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_repo_search', name: 'Repo search (connector)', description: 'Search code in connected repo', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_repo_pull_requests', name: 'List PRs (connector)', description: 'Read pull requests (metadata only)', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_repo_commits', name: 'Recent commits (connector)', description: 'List recent commits', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_jira_search', name: 'Jira search (connector)', description: 'Search Jira issues (read-only)', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_jira_get_issue', name: 'Jira get issue (connector)', description: 'Fetch Jira issue detail', category: 'connector', riskLevel: 'medium', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_support_search', name: 'Support tickets search', description: 'Search support tickets (Zendesk/mock)', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_support_get_ticket', name: 'Support ticket get', description: 'Fetch support ticket detail', category: 'connector', riskLevel: 'medium', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_confluence_search', name: 'Confluence search', description: 'Search Confluence pages', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_confluence_get_page', name: 'Confluence get page', description: 'Read Confluence page body', category: 'connector', riskLevel: 'medium', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_cicd_list_files', name: 'CI/CD list files', description: 'List pipeline-related files', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_cicd_read_file', name: 'CI/CD read file', description: 'Read pipeline config file', category: 'connector', riskLevel: 'medium', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
	{ id: 'connector_cicd_analyze', name: 'CI/CD analyze', description: 'Heuristic pipeline analysis', category: 'connector', riskLevel: 'low', enabled: true, requiresApproval: false, allowedInModes: m(['ask', 'plan', 'act']) },
];
