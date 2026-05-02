import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs/promises';
import * as path from 'path';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	const cfg = app.get(AppConfigService);
	cfg.validateAuthSecretsForProduction();

	const shotDir = path.join(process.cwd(), cfg.browserScreenshotDir);
	await fs.mkdir(shotDir, { recursive: true });
	app.useStaticAssets(shotDir, {
		prefix: '/browser/screenshots',
		index: false,
	});

	const testShotDir = path.join(process.cwd(), cfg.browserScreenshotDir);
	const videoDir = path.join(process.cwd(), cfg.browserVideoDir);
	const traceDir = path.join(process.cwd(), cfg.browserTraceDir);
	const reportDir = path.join(process.cwd(), cfg.playwrightTestOutputDir);
	await fs.mkdir(testShotDir, { recursive: true });
	await fs.mkdir(videoDir, { recursive: true });
	await fs.mkdir(traceDir, { recursive: true });
	await fs.mkdir(reportDir, { recursive: true });
	app.useStaticAssets(testShotDir, { prefix: '/test-assets/screenshots', index: false });
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

	await app.listen(cfg.port);
	// eslint-disable-next-line no-console
	console.log(`Agent server listening on http://localhost:${cfg.port}`);
}

void bootstrap();
