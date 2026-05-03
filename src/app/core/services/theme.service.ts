import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'bm-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
	private readonly document = inject(DOCUMENT);

	private readonly mq =
		typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;

	readonly mode = signal<ThemeMode>(this.readStored());

	constructor() {
		this.mq?.addEventListener('change', () => {
			if (this.mode() === 'system') {
				this.applyResolvedTheme();
			}
		});

		effect(() => this.persistAndApply(this.mode()));
	}

	setMode(mode: ThemeMode): void {
		this.mode.set(mode);
	}

	toggleMode(mode: ThemeMode): void {
		this.mode.update((current) => (current === mode ? current : mode));
	}

	private readStored(): ThemeMode {
		try {
			const v = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
			if (v === 'system' || v === 'light' || v === 'dark') return v;
		} catch {
			/* ignore */
		}
		return 'system';
	}

	private persistAndApply(mode: ThemeMode): void {
		try {
			localStorage.setItem(STORAGE_KEY, mode);
		} catch {
			/* ignore */
		}
		const root = this.document.documentElement;
		if (mode === 'dark') {
			root.classList.add('dark');
		} else if (mode === 'light') {
			root.classList.remove('dark');
		} else {
			this.applyResolvedTheme();
		}
	}

	private applyResolvedTheme(): void {
		const root = this.document.documentElement;
		const dark = this.mq?.matches ?? false;
		root.classList.toggle('dark', dark);
	}
}
