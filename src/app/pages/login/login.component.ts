import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';

import { AuthStore } from '../../core/services/auth.store';
import { environment } from '../../../environments/environment';

@Component({
	selector: 'app-login',
	standalone: true,
	imports: [FormsModule, Button, IconField, InputIcon, InputText, Password],
	templateUrl: './login.component.html',
})
export class LoginComponent {
	private readonly router = inject(Router);
	protected readonly auth = inject(AuthStore);

	email = '';
	password = '';
	readonly isSubmitting = signal(false);
	protected readonly env = environment;

	async onSubmit(): Promise<void> {
		this.auth.error.set(null);
		if (this.env.enableMockAgents) {
			await this.router.navigateByUrl('/dashboard');
			return;
		}
		this.isSubmitting.set(true);
		const ok = await this.auth.login(this.email.trim(), this.password);
		this.isSubmitting.set(false);
		if (ok) {
			const navigated = await this.router.navigateByUrl('/dashboard');
			if (!navigated) {
				this.auth.error.set('Could not open the dashboard (navigation was blocked).');
			}
		}
	}

	clearError(): void {
		this.auth.error.set(null);
	}
}
