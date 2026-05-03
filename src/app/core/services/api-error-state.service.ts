import { Injectable, signal } from '@angular/core';

export interface ApiErrorBanner {
	readonly status: number;
	readonly message: string;
}

@Injectable({ providedIn: 'root' })
export class ApiErrorStateService {
	readonly lastHttpError = signal<ApiErrorBanner | null>(null);

	setError(status: number, message: string): void {
		this.lastHttpError.set({ status, message });
	}

	clear(): void {
		this.lastHttpError.set(null);
	}
}
