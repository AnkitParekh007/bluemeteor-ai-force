import 'reflect-metadata';

import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs/promises';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { AppConfigService } from './config/app-config.service';
import { StartupValidationService } from './config/startup-validation.service';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	const cfg = app.get(AppConfigService);
	const startup = app.get(StartupValidationService);

	startup.validateForProduction();
	const asyncVal = await startup.evaluateAsync();
	const logger = new Logger('Bootstrap');
	for (const w of asyncVal.warnings) {
		logger.warn(w);
	}

	const prefix = cfg.apiGlobalPrefix;
	if (prefix) {
		app.setGlobalPrefix(prefix, {
			exclude: [
				{ path: 'health', method: RequestMethod.GET },
				{ path: 'live', method: RequestMethod.GET },
				{ path: 'ready', method: RequestMethod.GET },
			],
		});
	}

	const shotDir = cfg.browserScreenshotDir;
	await fs.mkdir(shotDir, { recursive: true });
	app.useStaticAssets(shotDir, {
		prefix: '/browser/screenshots',
		index: false,
	});

	const videoDir = cfg.browserVideoDir;
	const traceDir = cfg.browserTraceDir;
	const reportDir = cfg.playwrightTestOutputDir;
	await fs.mkdir(shotDir, { recursive: true });
	await fs.mkdir(videoDir, { recursive: true });
	await fs.mkdir(traceDir, { recursive: true });
	await fs.mkdir(reportDir, { recursive: true });
	app.useStaticAssets(shotDir, { prefix: '/test-assets/screenshots', index: false });
	app.useStaticAssets(videoDir, { prefix: '/test-assets/videos', index: false });
	app.useStaticAssets(traceDir, { prefix: '/test-assets/traces', index: false });
	app.useStaticAssets(reportDir, { prefix: '/test-assets/reports', index: false });

	app.enableCors({
		origin: cfg.corsOrigin.split(',').map((s) => s.trim()),
		credentials: true,
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		}),
	);
	app.useGlobalFilters(new ThrottlerExceptionFilter(), new HttpExceptionFilter(cfg));

	await app.listen(cfg.port);
	// eslint-disable-next-line no-console
	console.log(`Agent server listening on http://localhost:${cfg.port}`);
}

void bootstrap();
