import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ToolsModule } from '../tools/tools.module';
import { BrowserController } from './browser.controller';
import { BrowserActionRepository } from './repositories/browser-action.repository';
import { BrowserAuthCaptureRepository } from './repositories/browser-auth-capture.repository';
import { BrowserProfileRepository } from './repositories/browser-profile.repository';
import { BrowserSessionRepository } from './repositories/browser-session.repository';
import { BrowserSnapshotRepository } from './repositories/browser-snapshot.repository';
import { BrowserAuthCaptureService } from './services/browser-auth-capture.service';
import { BrowserProfileService } from './services/browser-profile.service';
import { BrowserSessionService } from './services/browser-session.service';
import { BrowserWorkerService } from './services/browser-worker.service';

@Module({
	imports: [AuthModule, forwardRef(() => ToolsModule)],
	controllers: [BrowserController],
	providers: [
		BrowserSessionRepository,
		BrowserActionRepository,
		BrowserSnapshotRepository,
		BrowserProfileRepository,
		BrowserAuthCaptureRepository,
		BrowserSessionService,
		BrowserWorkerService,
		BrowserProfileService,
		BrowserAuthCaptureService,
	],
	exports: [
		BrowserSessionService,
		BrowserWorkerService,
		BrowserSnapshotRepository,
		BrowserProfileService,
		BrowserAuthCaptureService,
	],
})
export class BrowserModule {}
