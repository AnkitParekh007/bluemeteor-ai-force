import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ProvidersModule } from '../providers/providers.module';
import { OpsController } from './ops.controller';
import { AppLoggerService } from './services/app-logger.service';
import { MetricsService } from './services/metrics.service';
import { ReadinessService } from './services/readiness.service';
import { RequestLoggingMiddleware } from './services/request-logging.middleware';
import { RuntimeMetricsService } from './services/runtime-metrics.service';

@Module({
	imports: [ProvidersModule, DatabaseModule],
	controllers: [OpsController],
	providers: [AppLoggerService, RuntimeMetricsService, MetricsService, ReadinessService],
	exports: [AppLoggerService, RuntimeMetricsService, MetricsService, ReadinessService],
})
export class ObservabilityModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(RequestLoggingMiddleware).forRoutes('*');
	}
}
