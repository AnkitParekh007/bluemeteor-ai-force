import { Injectable } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';

import type { AiProvider } from '../models/ai-provider.model';
import type {
	AiProviderRequest,
	AiProviderResponse,
	AiProviderStreamEvent,
} from '../models/ai-provider.model';

@Injectable()
export class MockAiProviderService implements AiProvider {
	readonly name = 'mock';

	async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
		return {
			content: this.buildMarkdown(request),
			provider: this.name,
			model: 'mock-v1',
			metadata: { mode: request.mode },
		};
	}

	stream(request: AiProviderRequest): Observable<AiProviderStreamEvent> {
		return new Observable((sub: Subscriber<AiProviderStreamEvent>) => {
			const full = this.buildMarkdown(request);
			const chunks = full.split(/(?=\s)/).filter(Boolean);
			let i = 0;
			const tick = () => {
				if (i < chunks.length) {
					sub.next({ type: 'token', token: chunks[i++] });
					setTimeout(tick, 8);
				} else {
					sub.next({ type: 'completed', content: full });
					sub.complete();
				}
			};
			tick();
		});
	}

	private buildMarkdown(req: AiProviderRequest): string {
		const modeLine =
			req.mode === 'ask'
				? '**Mode:** Ask — exploring tradeoffs.\n\n'
				: req.mode === 'plan'
					? '**Mode:** Plan — milestones & verification.\n\n'
					: '**Mode:** Act — concrete drafts.\n\n';
		const body = this.scenario(req.agentSlug, req.userMessage);
		const toolCtx =
			req.toolContextBlock?.trim() ??
			(typeof req.context?.['toolExecutionSummaries'] === 'string'
				? String(req.context?.['toolExecutionSummaries'])
				: '');
		const obs =
			toolCtx.length > 0
				? `### Live observations (tools/browser)\n${toolCtx.slice(0, 12000)}\n\n`
				: '';
		return modeLine + obs + body;
	}

	private scenario(slug: string, raw: string): string {
		const m = raw.toLowerCase();
		const intro = (name: string, role: string) => `I'm **${name}** (${role}).\n\n`;

		switch (slug) {
			case 'fronto':
				return (
					intro('Fronto', 'Angular / UI') +
					(this.match(m, /component|supplier|upload|card/)
						? `### Supplier upload card\n- Standalone component + \`p-card\` host.\n- Drag-drop zone with MIME validation.\n- Inline errors via \`p-message\`.\n- **A11y:** focus order, live region for errors.\n`
						: `### UI guidance\n- Prefer composition over giant templates.\n- Tailwind utilities + PrimeNG for density.\n`)
				);
			case 'backo':
				return (
					intro('Backo', 'NestJS / APIs') +
					`### Agent sessions contract\n- \`POST /agents/:slug/sessions\` → session id.\n- \`POST /agents/sessions/:id/messages\` → run + artifacts.\n- DTOs validated with \`class-validator\`.\n`
				);
			case 'testo':
				return (
					intro('Testo', 'QA') +
					`### Regression — login\n1. Valid creds → dashboard.\n2. Invalid creds → consistent error.\n3. Session survives refresh where configured.\n\n` +
					`Playwright: prefer \`getByRole\` + stable \`data-testid\`.\n`
				);
			case 'producto':
				return (
					intro('Producto', 'Product') +
					`### User stories (browser testing)\n- As QA, I trace runs to sessions.\n- As a reviewer, I approve risky tools.\n- As a PM, I compare artifact throughput weekly.\n`
				);
			case 'doco':
				return (
					intro('Doco', 'Docs') +
					`### Release notes — Agent workspace\n- Nest orchestrator + mock providers.\n- Angular workspace hooked via \`AgentApiService\`.\n- Next: streaming SSE, persistence.\n`
				);
			case 'dato':
				return (
					intro('Dato', 'Data') +
					`### SQL — failed supplier uploads\n\`\`\`sql\nSELECT DATE_TRUNC('day', failed_at) AS day, COUNT(*) AS fails\nFROM supplier_uploads\nWHERE status = 'failed'\nGROUP BY 1 ORDER BY 1 DESC LIMIT 30;\n\`\`\`\n`
				);
			case 'supporto':
				return (
					intro('Supporto', 'Support') +
					`### Ticket summary\n- Issue: upload timeouts / 504 suspicion.\n- Next steps: capture correlation id, verify payload size limits.\n\n### Draft reply\n> Thanks for your patience — we’re reviewing the upload path with our latest logs…\n`
				);
			case 'devopsy':
				return (
					intro('DevOpsy', 'DevOps') +
					`### Production deployment checklist\n- [ ] Migrations dry-run on staging\n- [ ] Feature flags verified\n- [ ] Rollback commit tagged\n- [ ] On-call notified\n`
				);
			default:
				return `### Response\n${raw.slice(0, 2000)}`;
		}
	}

	private match(m: string, re: RegExp): boolean {
		return re.test(m);
	}
}
