import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AppConfigService } from '../../config/app-config.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly log = new Logger(HttpExceptionFilter.name);

	constructor(private readonly cfg: AppConfigService) {}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const res = ctx.getResponse<Response>();
		const req = ctx.getRequest<Request & { traceId?: string }>();

		const traceId = req.traceId ?? '—';
		let status = HttpStatus.INTERNAL_SERVER_ERROR;
		let message = 'Internal server error';
		let error = 'Internal Server Error';

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const body = exception.getResponse();
			if (typeof body === 'string') {
				message = body;
			} else if (typeof body === 'object' && body !== null && 'message' in body) {
				const m = (body as { message?: unknown }).message;
				message = Array.isArray(m) ? m.join('; ') : String(m ?? message);
			}
			error = HttpException.name;
		} else if (exception instanceof Error) {
			message = this.cfg.isDevelopment ? exception.message : 'Internal server error';
			error = exception.name;
			this.log.error(exception.stack ?? exception.message);
		}

		const payload: Record<string, unknown> = {
			statusCode: status,
			message,
			error,
			traceId,
			timestamp: new Date().toISOString(),
			path: req.originalUrl ?? req.url,
		};

		if (this.cfg.isDevelopment && exception instanceof Error) {
			payload.stack = exception.stack;
		}

		res.status(status).json(payload);
	}
}
