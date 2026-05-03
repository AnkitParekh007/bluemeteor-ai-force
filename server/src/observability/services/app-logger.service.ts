import { Injectable, LoggerService } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

export interface StructuredLogFields {
	readonly context?: string;
	readonly traceId?: string;
	readonly userId?: string;
	readonly sessionId?: string;
	readonly runId?: string;
	readonly agentSlug?: string;
	readonly durationMs?: number;
	readonly errorCode?: string;
	readonly errorMessage?: string;
}

@Injectable()
export class AppLoggerService implements LoggerService {
	private readonly nestFallback = new (class {
		constructor(private readonly name: string) {}
		log(m: string) {
			// eslint-disable-next-line no-console
			console.log(`[${this.name}] ${m}`);
		}
		error(m: string, trace?: string) {
			// eslint-disable-next-line no-console
			console.error(`[${this.name}] ${m}`, trace ?? '');
		}
		warn(m: string) {
			// eslint-disable-next-line no-console
			console.warn(`[${this.name}] ${m}`);
		}
		debug(m: string) {
			// eslint-disable-next-line no-console
			console.debug(`[${this.name}] ${m}`);
		}
		verbose(m: string) {
			// eslint-disable-next-line no-console
			console.log(`[${this.name}] ${m}`);
		}
	})('App');

	constructor(private readonly cfg: AppConfigService) {}

	private line(
		level: 'debug' | 'info' | 'warn' | 'error',
		message: string,
		fields: StructuredLogFields,
	): void {
		const structured = this.cfg.structuredLogging;
		const ts = new Date().toISOString();
		if (structured) {
			const row: Record<string, unknown> = {
				timestamp: ts,
				level,
				message,
				...fields,
			};
			// eslint-disable-next-line no-console
			console.log(JSON.stringify(row));
			return;
		}
		const bits = [message];
		if (fields.traceId) bits.push(`traceId=${fields.traceId}`);
		if (fields.runId) bits.push(`runId=${fields.runId}`);
		const line = bits.join(' ');
		if (level === 'error') this.nestFallback.error(line);
		else if (level === 'warn') this.nestFallback.warn(line);
		else this.nestFallback.log(line);
	}

	log(message: string, context?: string): void {
		this.line('info', message, { context });
	}

	error(message: string, trace?: string, context?: string): void {
		this.line('error', message, { context, errorMessage: trace });
	}

	warn(message: string, context?: string): void {
		this.line('warn', message, { context });
	}

	debug(message: string, context?: string): void {
		this.line('debug', message, { context });
	}

	verbose(message: string, context?: string): void {
		this.line('debug', message, { context });
	}

	info(message: string, fields: StructuredLogFields = {}): void {
		this.line('info', message, fields);
	}

	structured(level: 'debug' | 'info' | 'warn' | 'error', message: string, fields: StructuredLogFields = {}): void {
		this.line(level, message, fields);
	}
}
