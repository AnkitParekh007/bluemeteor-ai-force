import { Injectable } from '@nestjs/common';

/** In-memory counters for hot paths (SSE, providers). DB-backed metrics use MetricsService snapshot. */
@Injectable()
export class RuntimeMetricsService {
	private sseOpened = 0;
	private sseClosed = 0;
	private sseErrors = 0;
	private activeSse = 0;
	private providerCalls = new Map<string, number>();
	private providerFailures = new Map<string, number>();
	private rateLimitHits = 0;

	recordSseOpen(): void {
		this.sseOpened++;
		this.activeSse++;
	}

	recordSseClose(): void {
		this.sseClosed++;
		this.activeSse = Math.max(0, this.activeSse - 1);
	}

	recordSseError(): void {
		this.sseErrors++;
	}

	recordProviderCall(provider: string): void {
		const k = provider || 'unknown';
		this.providerCalls.set(k, (this.providerCalls.get(k) ?? 0) + 1);
	}

	recordProviderFailure(provider: string): void {
		const k = provider || 'unknown';
		this.providerFailures.set(k, (this.providerFailures.get(k) ?? 0) + 1);
	}

	recordRateLimitHit(): void {
		this.rateLimitHits++;
	}

	snapshot(): Record<string, unknown> {
		return {
			sse: {
				opened: this.sseOpened,
				closed: this.sseClosed,
				errors: this.sseErrors,
				activeStreams: this.activeSse,
			},
			providerCallsByProvider: Object.fromEntries(this.providerCalls),
			providerFailuresByProvider: Object.fromEntries(this.providerFailures),
			rateLimitHits: this.rateLimitHits,
		};
	}
}
