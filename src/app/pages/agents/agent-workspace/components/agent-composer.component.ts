import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
	selector: 'app-agent-composer',
	standalone: true,
	templateUrl: './agent-composer.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentComposerComponent {
	readonly disabled = input(false);
	readonly placeholder = input('Message this agent…');
	readonly quickTasks = input<readonly string[]>([]);

	readonly sendMessage = output<string>();
	readonly quickTaskSelected = output<string>();
	readonly attachClicked = output<void>();
	readonly contextClicked = output<void>();

	readonly draft = signal('');

	protected onKeydown(ev: KeyboardEvent): void {
		if (ev.key !== 'Enter') return;
		if (ev.shiftKey) return;
		ev.preventDefault();
		this.submit();
	}

	protected submit(): void {
		if (this.disabled()) return;
		const t = this.draft().trim();
		if (!t) return;
		this.draft.set('');
		this.sendMessage.emit(t);
	}

	protected onQuickTask(q: string): void {
		this.quickTaskSelected.emit(q);
	}

	protected autoGrow(textarea: HTMLTextAreaElement): void {
		textarea.style.height = 'auto';
		const max = 160;
		textarea.style.height = `${Math.min(textarea.scrollHeight, max)}px`;
	}
}
