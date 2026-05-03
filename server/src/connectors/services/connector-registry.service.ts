import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import type { ConnectorDefinition, ConnectorProvider, ConnectorStatus, ConnectorType } from '../models/connector.model';

const CAPABILITY_MAP: Record<string, string[]> = {
	bitbucket: ['repository.list', 'repository.read_file', 'repository.search', 'pull_request.read', 'commit.read'],
	github: ['repository.list', 'repository.read_file', 'repository.search', 'pull_request.read', 'commit.read'],
	jira: ['ticket.search', 'ticket.read', 'ticket.recent'],
	confluence: ['docs.search', 'docs.read', 'docs.recent'],
	support: ['support_ticket.search', 'support_ticket.read', 'support_ticket.recent'],
	cicd: ['cicd.read_file', 'cicd.analyze'],
};

@Injectable()
export class ConnectorRegistryService {
	constructor(private readonly cfg: AppConfigService) {}

	private statusFor(enabledFlag: boolean, hasCreds: boolean): ConnectorStatus {
		if (!this.cfg.enableConnectors) return 'disabled';
		if (!enabledFlag) return 'disabled';
		if (!hasCreds) return this.cfg.enableConnectorMockFallback ? 'enabled' : 'missing_config';
		return 'enabled';
	}

	listConnectors(): ConnectorDefinition[] {
		const bbCreds =
			!!this.cfg.bitbucketWorkspace && !!this.cfg.bitbucketUsername && !!this.cfg.bitbucketAppPassword;
		const ghCreds = !!this.cfg.githubToken;
		const jiraCreds = !!this.cfg.jiraBaseUrl && !!this.cfg.jiraEmail && !!this.cfg.jiraApiToken;
		const confCreds = !!this.cfg.confluenceBaseUrl && !!this.cfg.confluenceEmail && !!this.cfg.confluenceApiToken;
		const rows: Array<{
			id: string;
			provider: ConnectorProvider;
			type: ConnectorType;
			name: string;
			description: string;
			enabledFlag: boolean;
			hasCreds: boolean;
		}> = [
			{
				id: 'bitbucket',
				provider: 'bitbucket',
				type: 'repository',
				name: 'Bitbucket',
				description: 'Read repositories, files, PRs, commits',
				enabledFlag: this.cfg.enableBitbucketConnector,
				hasCreds: bbCreds,
			},
			{
				id: 'github',
				provider: 'github',
				type: 'repository',
				name: 'GitHub',
				description: 'Optional GitHub read API',
				enabledFlag: this.cfg.enableGithubConnector,
				hasCreds: ghCreds,
			},
			{
				id: 'jira',
				provider: 'jira',
				type: 'tickets',
				name: 'Jira',
				description: 'Read Jira issues',
				enabledFlag: this.cfg.enableJiraConnector,
				hasCreds: jiraCreds,
			},
			{
				id: 'confluence',
				provider: 'confluence',
				type: 'docs',
				name: 'Confluence',
				description: 'Read Confluence pages',
				enabledFlag: this.cfg.enableConfluenceConnector,
				hasCreds: confCreds,
			},
			{
				id: 'support',
				provider: this.cfg.supportConnectorProvider === 'servicenow' ? 'servicenow' : this.cfg.supportConnectorProvider === 'zendesk' ? 'zendesk' : 'mock',
				type: 'support',
				name: 'Support',
				description: 'Zendesk / ServiceNow / mock',
				enabledFlag:
					this.cfg.enableSupportConnector ||
					this.cfg.supportConnectorProvider === 'mock' ||
					this.cfg.enableConnectorMockFallback,
				hasCreds:
					this.cfg.supportConnectorProvider === 'mock'
						? true
						: this.cfg.supportConnectorProvider === 'zendesk'
							? !!this.cfg.zendeskBaseUrl && !!this.cfg.zendeskEmail && !!this.cfg.zendeskApiToken
							: this.cfg.supportConnectorProvider === 'servicenow'
								? !!this.cfg.servicenowBaseUrl && !!this.cfg.servicenowUsername && !!this.cfg.servicenowPassword
								: false,
			},
			{
				id: 'cicd',
				provider: 'local',
				type: 'cicd',
				name: 'CI/CD',
				description: 'Local pipeline file reader',
				enabledFlag: this.cfg.enableCicdConnector,
				hasCreds: this.cfg.enableCicdReader,
			},
		];

		return rows.map((r) => ({
			id: r.id,
			provider: r.provider,
			type: r.type,
			name: r.name,
			description: r.description,
			enabled: this.cfg.enableConnectors && r.enabledFlag,
			readOnly: true,
			status: this.statusFor(r.enabledFlag, r.hasCreds),
			capabilities: CAPABILITY_MAP[r.id] ?? [],
		}));
	}

	getConnector(connectorId: string): ConnectorDefinition | undefined {
		return this.listConnectors().find((c) => c.id === connectorId);
	}

	isConnectorEnabled(connectorId: string): boolean {
		const c = this.getConnector(connectorId);
		return !!c?.enabled && c.status !== 'disabled';
	}

	getConnectorCapabilities(connectorId: string): string[] {
		return this.getConnector(connectorId)?.capabilities ?? [];
	}

	getConnectorForTool(toolId: string): string | undefined {
		if (toolId.startsWith('connector_repo')) return this.listConnectors().find((c) => c.id === 'bitbucket' || c.id === 'github')?.id;
		if (toolId.startsWith('connector_jira')) return 'jira';
		if (toolId.startsWith('connector_confluence')) return 'confluence';
		if (toolId.startsWith('connector_support')) return 'support';
		if (toolId.startsWith('connector_cicd')) return 'cicd';
		if (toolId === 'connector_list' || toolId === 'connector_health') return 'system';
		return undefined;
	}
}
