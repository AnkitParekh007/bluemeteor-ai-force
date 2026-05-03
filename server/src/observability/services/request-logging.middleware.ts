import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { AppLoggerService } from './app-logger.service';

function redactUrl(raw: string): string {
	try {
		const u = new URL(raw, 'http://localhost');
		for (const k of [...u.searchParams.keys()]) {
			if (k.toLowerCase() === 'streamtoken' || k.toLowerCase() === 'stream_token') {
				u.searchParams.set(k, '[redacted]');
			}
		}
		return u.pathname + u.search;
	} catch {
		return '[invalid-url]';
	}
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
	constructor(private readonly log: AppLoggerService) {}

	use(req: Request, res: Response, next: NextFunction): void {
		const traceId = (req.headers['x-request-id'] as string)?.trim() || randomUUID();
		(req as Request & { traceId?: string }).traceId = traceId;
		res.setHeader('x-request-id', traceId);

		const started = Date.now();
		const method = req.method;
		const path = redactUrl(req.originalUrl ?? req.url);

		res.on('finish', () => {
			const ms = Date.now() - started;
			this.log.structured('info', 'http_request', {
				context: 'RequestLoggingMiddleware',
				traceId,
				durationMs: ms,
				errorMessage: `${method} ${path} status=${res.statusCode}`,
			});
		});

		next();
	}
}
