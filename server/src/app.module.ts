import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppConfigService } from './config/app-config.service';
import { AgentCoreModule } from './agents/agent-core.module';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { BrowserModule } from './browser/browser.module';
import { DatabaseModule } from './database/database.module';
import { ProvidersModule } from './providers/providers.module';
import { RagModule } from './rag/rag.module';
import { TestingModule } from './testing/testing.module';
import { InternalToolsModule } from './internal-tools/internal-tools.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { ToolsModule } from './tools/tools.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
		DatabaseModule,
		ThrottlerModule.forRootAsync({
			imports: [ProvidersModule],
			inject: [AppConfigService],
			useFactory: (cfg: AppConfigService) => ({
				skipIf: () => !cfg.enableRateLimiting,
				throttlers: [
					{
						name: 'default',
						ttl: cfg.rateLimitTtlSeconds * 1000,
						limit: cfg.rateLimitMaxRequests,
					},
					{
						name: 'agent',
						ttl: cfg.rateLimitTtlSeconds * 1000,
						limit: cfg.agentRateLimitMaxRequests,
					},
					{
						name: 'browser',
						ttl: cfg.rateLimitTtlSeconds * 1000,
						limit: cfg.browserRateLimitMaxRequests,
					},
					{
						name: 'login',
						ttl: 60_000,
						limit: 30,
					},
				],
			}),
		}),
		AuthModule,
		AgentCoreModule,
		ProvidersModule,
		ToolsModule,
		InternalToolsModule,
		ConnectorsModule,
		BrowserModule,
		TestingModule,
		RagModule,
		AgentsModule,
	],
	controllers: [AppController],
	providers: [
		{ provide: APP_GUARD, useClass: JwtAuthGuard },
		{ provide: APP_GUARD, useClass: PermissionsGuard },
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
	],
})
export class AppModule {}
