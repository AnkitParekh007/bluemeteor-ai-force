import { Injectable } from '@nestjs/common';

import { PilotMetricsService } from './pilot-metrics.service';
import { PilotReadinessService } from './pilot-readiness.service';

@Injectable()
export class PilotReportService {
	constructor(
		private readonly metrics: PilotMetricsService,
		private readonly readiness: PilotReadinessService,
	) {}

	async generatePilotReport(): Promise<{ markdown: string; data: Record<string, unknown> }> {
		const [m, r] = await Promise.all([this.metrics.getMetrics(), this.readiness.getReadinessGate()]);
		const lines: string[] = [];
		lines.push(`# Bluemeteor AI Force — pilot report`);
		lines.push('');
		lines.push(`Generated: ${new Date().toISOString()}`);
		lines.push('');
		lines.push(`## Executive summary`);
		lines.push(`- Readiness gate: **${String(r['gate'])}**`);
		lines.push(`- Feedback submissions: **${String((m['feedback'] as { totalCount?: number })?.totalCount ?? '—')}**`);
		lines.push(
			`- Average rating: **${String((m['feedback'] as { averageRating?: number | null })?.averageRating ?? '—')}**`,
		);
		lines.push('');
		lines.push(`## Readiness`);
		lines.push('See structured `readiness` in JSON export.');
		lines.push('');
		lines.push(`## Metrics highlights`);
		lines.push('Top agents by volume are included in the JSON `byAgent` list.');
		lines.push('');
		lines.push(`## Recommended next actions`);
		const checks = (r['checks'] as { status: string; title: string; recommendation?: string }[]) ?? [];
		for (const c of checks.filter((x) => x.status !== 'passed').slice(0, 12)) {
			lines.push(`- ${c.title}${c.recommendation ? `: ${c.recommendation}` : ''}`);
		}
		if (!checks.some((x) => x.status !== 'passed')) {
			lines.push('- All automated checks passed; continue monitoring during pilot.');
		}
		const data = { metrics: m, readiness: r };
		return { markdown: lines.join('\n'), data };
	}
}
