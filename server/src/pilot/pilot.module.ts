import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { DatabaseModule } from '../database/database.module';
import { InternalToolsModule } from '../internal-tools/internal-tools.module';
import { ObservabilityModule } from '../observability/observability.module';
import { ProvidersModule } from '../providers/providers.module';
import { PilotController } from './pilot.controller';
import { PilotFeedbackRepository } from './repositories/pilot-feedback.repository';
import { PilotFeedbackService } from './services/pilot-feedback.service';
import { PilotMetricsService } from './services/pilot-metrics.service';
import { PilotReadinessService } from './services/pilot-readiness.service';
import { PilotReportService } from './services/pilot-report.service';

@Module({
	imports: [
		AuthModule,
		DatabaseModule,
		ProvidersModule,
		AdminModule,
		ConnectorsModule,
		InternalToolsModule,
		ObservabilityModule,
	],
	controllers: [PilotController],
	providers: [
		PilotFeedbackRepository,
		PilotFeedbackService,
		PilotMetricsService,
		PilotReadinessService,
		PilotReportService,
	],
})
export class PilotModule {}
