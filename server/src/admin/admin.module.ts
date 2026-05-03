import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { DatabaseModule } from '../database/database.module';
import { InternalToolsModule } from '../internal-tools/internal-tools.module';
import { ProvidersModule } from '../providers/providers.module';
import { AdminController } from './admin.controller';
import { AdminSummaryService } from './admin-summary.service';

@Module({
	imports: [AuthModule, DatabaseModule, ProvidersModule, ConnectorsModule, InternalToolsModule],
	controllers: [AdminController],
	providers: [AdminSummaryService],
	exports: [AdminSummaryService],
})
export class AdminModule {}
