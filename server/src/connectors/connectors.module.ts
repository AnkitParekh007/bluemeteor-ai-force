import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ProvidersModule } from '../providers/providers.module';
import { InternalToolsModule } from '../internal-tools/internal-tools.module';
import { ConnectorsController } from './controllers/connectors.controller';
import { ConnectorCallRepository } from './repositories/connector-call.repository';
import { BitbucketConnectorService } from './services/bitbucket-connector.service';
import { CicdConnectorService } from './services/cicd-connector.service';
import { ConfluenceConnectorService } from './services/confluence-connector.service';
import { ConnectorHealthService } from './services/connector-health.service';
import { ConnectorHttpService } from './services/connector-http.service';
import { ConnectorHubService } from './services/connector-hub.service';
import { ConnectorOutputNormalizerService } from './services/connector-output-normalizer.service';
import { ConnectorRegistryService } from './services/connector-registry.service';
import { GithubConnectorService } from './services/github-connector.service';
import { JiraConnectorService } from './services/jira-connector.service';
import { SupportTicketConnectorService } from './services/support-ticket-connector.service';

@Module({
	imports: [ProvidersModule, DatabaseModule, AuthModule, InternalToolsModule],
	controllers: [ConnectorsController],
	providers: [
		ConnectorHttpService,
		ConnectorCallRepository,
		BitbucketConnectorService,
		GithubConnectorService,
		JiraConnectorService,
		ConfluenceConnectorService,
		SupportTicketConnectorService,
		CicdConnectorService,
		ConnectorOutputNormalizerService,
		ConnectorRegistryService,
		ConnectorHealthService,
		ConnectorHubService,
	],
	exports: [ConnectorHubService, ConnectorRegistryService, ConnectorHealthService, ConnectorCallRepository],
})
export class ConnectorsModule {}
