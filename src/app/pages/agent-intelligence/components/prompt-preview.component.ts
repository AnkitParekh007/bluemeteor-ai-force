import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';

import type { AgentPromptTemplate } from '../../../core/models/agent-intelligence.models';
import { AgentIntelligenceApiService } from '../../../core/services/agent-intelligence-api.service';

@Component({
	selector: 'app-prompt-preview',
	standalone: true,
	templateUrl: './prompt-preview.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptPreviewComponent {
	readonly template = input.required<AgentPromptTemplate>();
	readonly variables = input.required<Record<string, unknown>>();

	private readonly api = inject(AgentIntelligenceApiService);

	protected readonly rendered = signal<string>('');
	protected readonly missing = signal<string[]>([]);
	protected readonly loading = signal(false);

	protected loadRender(): void {
		const t = this.template();
		this.loading.set(true);
		this.api
			.renderPrompt({
				agentSlug: t.agentSlug,
				templateType: t.type,
				variables: this.variables(),
			})
			.subscribe({
				next: (r) => {
					this.rendered.set(r.content);
					this.missing.set(r.missingVariables ?? []);
					this.loading.set(false);
				},
				error: () => this.loading.set(false),
			});
	}

	protected copy(text: string): void {
		void navigator.clipboard.writeText(text);
	}
}
