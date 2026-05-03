import { type ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
	catch(_exception: ThrottlerException, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const res = ctx.getResponse<Response>();
		const retryAfterSeconds = 60;
		res.status(HttpStatus.TOO_MANY_REQUESTS).json({
			message: 'Rate limit exceeded. Try again later.',
			retryAfterSeconds,
		});
	}
}
