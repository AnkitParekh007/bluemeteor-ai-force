import { Injectable } from '@nestjs/common';

import { isoNow } from '../../common/utils/dates';
import { newId } from '../../common/utils/ids';
import type { AgentArtifact, AgentArtifactType } from '../models/agent-artifact.model';
import { AgentArtifactRepository } from '../repositories/agent-artifact.repository';

@Injectable()
export class AgentArtifactService {
	constructor(private readonly repo: AgentArtifactRepository) {}

	async createArtifact(input: Omit<AgentArtifact, 'id' | 'createdAt'> & { id?: string }): Promise<AgentArtifact> {
		const t = isoNow();
		const a: AgentArtifact = {
			...input,
			id: input.id ?? newId('art'),
			createdAt: t,
			updatedAt: t,
		};
		return this.repo.create(a);
	}

	async listArtifacts(sessionId: string): Promise<AgentArtifact[]> {
		return this.repo.listBySessionId(sessionId);
	}

	async listArtifactsByRun(runId: string): Promise<AgentArtifact[]> {
		return this.repo.listByRunId(runId);
	}

	async getArtifact(artifactId: string): Promise<AgentArtifact | null> {
		return this.repo.findById(artifactId);
	}

	/** Role-specific demo artifacts aligned with Fronto/Testo/Backo/etc. scenarios */
	async generateForRun(params: {
		sessionId: string;
		runId: string;
		agentSlug: string;
		userMessage: string;
		finalAnswer: string;
	}): Promise<AgentArtifact[]> {
		const { sessionId, runId, agentSlug, userMessage } = params;
		const m = userMessage.toLowerCase();
		const out: AgentArtifact[] = [];

		const push = async (
			type: AgentArtifactType,
			title: string,
			content: string,
			language?: string,
			description?: string,
		) =>
			this.createArtifact({
				sessionId,
				runId,
				agentSlug,
				type,
				title,
				description,
				content,
				language,
			});

		switch (agentSlug) {
			case 'fronto':
				if (/\b(component|supplier|upload|card)\b/i.test(m)) {
					out.push(
						await push(
							'typescript',
							'supplier-upload-card.component.ts',
							`import { Component, output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-supplier-upload-card',
  standalone: true,
  imports: [CardModule, FileUploadModule, MessageModule],
  templateUrl: './supplier-upload-card.component.html',
})
export class SupplierUploadCardComponent {
  readonly filesSelected = output<File[]>();
  protected errorText = '';

  protected onSelect(files: File[]): void {
    this.filesSelected.emit(files);
  }
}
`,
							'typescript',
							'Standalone host + PrimeNG modules',
						),
					);
					out.push(
						await push(
							'html',
							'supplier-upload-card.component.html',
							`<p-card header="Supplier upload">
  <p-fileUpload mode="basic" chooseLabel="Choose CSV" (onSelect)="onSelect($event.files)" />
  @if (errorText) {
    <p-message severity="error" [text]="errorText" />
  }
</p-card>
`,
							'html',
						),
					);
				}
				out.push(
					await push(
						'checklist',
						'Accessibility checklist',
						'- [ ] Focus order visits upload control before actions\n- [ ] Errors announced (aria-live)\n- [ ] Keyboard-only path works\n',
						undefined,
						'WCAG-oriented pass',
					),
				);
				break;
			case 'backo':
				out.push(
					await push(
						'json',
						'Agent sessions API (sketch)',
						JSON.stringify(
							{
								paths: {
									'POST /agents/:agentSlug/sessions': { body: { mode: 'ask|plan|act' } },
									'POST /agents/sessions/:sessionId/messages': {
										body: { agentSlug: 'string', mode: 'string', message: 'string' },
									},
								},
							},
							null,
							2,
						),
						'json',
					),
				);
				out.push(
					await push(
						'typescript',
						'create-session.dto.ts',
						`export class CreateSessionDto {
  @IsIn(['ask', 'plan', 'act'])
  mode!: 'ask' | 'plan' | 'act';
}
`,
						'typescript',
					),
				);
				break;
			case 'testo':
				out.push(
					await push(
						'test',
						'login-regression.spec.ts (outline)',
						`import { test, expect } from '@playwright/test';

test('login happy path', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: /user/i }).fill('demo');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});
`,
						'typescript',
					),
				);
				break;
			case 'dato':
				out.push(
					await push(
						'sql',
						'failed-supplier-uploads.sql',
						`SELECT DATE_TRUNC('day', failed_at) AS day, COUNT(*) AS fails
FROM supplier_uploads
WHERE status = 'failed'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;`,
						'sql',
					),
				);
				break;
			case 'producto':
				out.push(
					await push(
						'markdown',
						'User stories — browser testing',
						'### Story\nAs QA, I need traceability from run → session so failures are reproducible.\n\n### AC\n- Given a completed run, when I open activity, then I see ordered runtime events.\n',
					),
				);
				break;
			case 'doco':
				out.push(
					await push(
						'markdown',
						'Release notes — agent workspace',
						'## Unreleased\n- NestJS orchestrator (mock providers)\n- Angular AgentApiService integration\n',
					),
				);
				break;
			case 'supporto':
				out.push(
					await push(
						'email',
						'Customer reply (draft)',
						`Subject: Re: Upload issue\n\nThanks for your patience — we're reviewing the upload path with correlation IDs from your last attempt.\n`,
						undefined,
						'Safe, empathetic tone',
					),
				);
				break;
			case 'devopsy':
				out.push(
					await push(
						'yaml',
						'release-checklist.yml',
						`checks:
  - name: migrations_dry_run
    stage: pre-deploy
  - name: feature_flags
    stage: pre-deploy
  - name: rollback_tag
    stage: post-deploy
`,
						'yaml',
					),
				);
				break;
			default:
				out.push(await push('markdown', 'Notes', params.finalAnswer.slice(0, 2000)));
		}

		return out;
	}
}
