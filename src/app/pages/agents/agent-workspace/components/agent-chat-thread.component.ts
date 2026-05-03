import { DatePipe } from '@angular/common';
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	effect,
	ElementRef,
	inject,
	input,
	untracked,
	viewChild,
} from '@angular/core';

import type { AgentRun } from '../../../../core/models/agent-runtime.models';
import type { AgentChatMessage } from '../../../../core/models/agent-session.models';
import type { Agent } from '../../../../core/models/agent.models';
import type { AgentSession } from '../../../../core/models/agent-session.models';

@Component({
	selector: 'app-agent-chat-thread',
	standalone: true,
	imports: [DatePipe],
	templateUrl: './agent-chat-thread.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentChatThreadComponent {
	private readonly host = inject(ElementRef<HTMLElement>);
	private readonly scrollRoot = viewChild<ElementRef<HTMLElement>>('scrollRoot');

	readonly messages = input.required<readonly AgentChatMessage[]>();
	readonly agent = input.required<Agent>();
	readonly activeSession = input<AgentSession | undefined>(undefined);
	readonly thinking = input(false);
	readonly suggestedChips = input<readonly string[]>([]);
	readonly activeRun = input<AgentRun | undefined>(undefined);
	readonly isStreaming = input(false);

	constructor() {
		afterNextRender(() => this.scrollToBottom());
		effect(() => {
			this.messages();
			this.thinking();
			this.activeRun();
			untracked(() => queueMicrotask(() => this.scrollToBottom()));
		});
	}

	private scrollToBottom(): void {
		const el = this.scrollRoot()?.nativeElement ?? this.host.nativeElement;
		const pane = el.querySelector('[data-thread-scroll]') as HTMLElement | null;
		const target = pane ?? el;
		target.scrollTop = target.scrollHeight;
	}
}
