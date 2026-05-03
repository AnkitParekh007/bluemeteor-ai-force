import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import type { AgentBrowserState } from '../../../../core/models/agent-session.models';

export type DevicePreview = 'desktop' | 'tablet' | 'mobile';

@Component({
	selector: 'app-agent-browser-preview',
	standalone: true,
	templateUrl: './agent-browser-preview.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentBrowserPreviewComponent {
	readonly browserState = input<AgentBrowserState | undefined>(undefined);
	readonly startPreview = output<void>();
	readonly urlChange = output<string>();

	readonly device = signal<DevicePreview>('desktop');

	protected goBack(): void {
		/* future: history */
	}
	protected goForward(): void {
		/* future: history */
	}
	protected refresh(): void {
		/* future: reload */
	}
	protected openExternal(): void {
		const u = this.browserState()?.currentUrl;
		if (u) window.open(u, '_blank', 'noopener');
	}
}
