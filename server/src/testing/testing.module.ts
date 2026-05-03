import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BrowserModule } from '../browser/browser.module';
import { PlaywrightTestingController } from './playwright-testing.controller';
import { PlaywrightSpecRepository } from './repositories/playwright-spec.repository';
import { PlaywrightTestCaseRepository } from './repositories/playwright-test-case.repository';
import { PlaywrightTestRunRepository } from './repositories/playwright-test-run.repository';
import { PlaywrightTestRunnerService } from './services/playwright-test-runner.service';
import { TestRunnerService } from './services/test-runner.service';

@Module({
	imports: [BrowserModule, AuthModule],
	controllers: [PlaywrightTestingController],
	providers: [
		TestRunnerService,
		PlaywrightSpecRepository,
		PlaywrightTestRunRepository,
		PlaywrightTestCaseRepository,
		PlaywrightTestRunnerService,
	],
	exports: [TestRunnerService, PlaywrightTestRunnerService, PlaywrightTestRunRepository],
})
export class TestingModule {}
