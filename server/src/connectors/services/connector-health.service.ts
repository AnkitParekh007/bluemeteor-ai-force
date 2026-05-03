import { Injectable } from '@nestjs/common';

import type { ConnectorHealth } from '../models/connector.model';
import { BitbucketConnectorService } from './bitbucket-connector.service';
import { CicdConnectorService } from './cicd-connector.service';
import { ConfluenceConnectorService } from './confluence-connector.service';
import { GithubConnectorService } from './github-connector.service';
import { JiraConnectorService } from './jira-connector.service';
import { SupportTicketConnectorService } from './support-ticket-connector.service';

@Injectable()
export class ConnectorHealthService {
	constructor(
		private readonly bitbucket: BitbucketConnectorService,
		private readonly github: GithubConnectorService,
		private readonly jira: JiraConnectorService,
		private readonly confluence: ConfluenceConnectorService,
		private readonly support: SupportTicketConnectorService,
		private readonly cicd: CicdConnectorService,
	) {}

	async getAllHealth(): Promise<ConnectorHealth[]> {
		return Promise.all([
			this.bitbucket.healthCheck(),
			this.github.healthCheck(),
			this.jira.healthCheck(),
			this.confluence.healthCheck(),
			this.support.healthCheck(),
			this.cicd.healthCheck(),
		]);
	}

	async getHealth(connectorId: string): Promise<ConnectorHealth> {
		const all = await this.getAllHealth();
		return all.find((h) => h.connectorId === connectorId) ?? {
			connectorId,
			status: 'error',
			message: 'Unknown connector',
			checkedAt: new Date().toISOString(),
		};
	}

	async refreshHealth(connectorId: string): Promise<ConnectorHealth> {
		return this.getHealth(connectorId);
	}
}
