import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';

import { AppConfigService } from './app-config.service';

export interface StartupValidationResult {
	readonly ok: boolean;
	readonly warnings: string[];
	readonly errors: string[];
}

@Injectable()
export class StartupValidationService {
	constructor(private readonly cfg: AppConfigService) {}

	validateForProduction(): void {
		if (!this.cfg.isDevelopment) {
			this.cfg.validateAuthSecretsForProduction();
		}
		const r = this.evaluateSync();
		if (!r.ok) {
			throw new Error(`Startup validation failed:\n${r.errors.join('\n')}`);
		}
	}

	/** Static checks only (no I/O). Does not call validateAuthSecretsForProduction. */
	evaluateSync(): StartupValidationResult {
		const warnings: string[] = [];
		const errors: string[] = [];

		if (this.cfg.isDevelopment) {
			if (this.cfg.databaseProvider === 'sqlite' && this.cfg.databaseUrl.includes('dev.db')) {
				warnings.push('Using SQLite dev database (expected for local development).');
			}
			return { ok: true, warnings, errors };
		}

		if (this.cfg.databaseProvider === 'sqlite' && !this.cfg.allowSqliteInProduction) {
			errors.push('Production requires PostgreSQL (DATABASE_PROVIDER=postgresql) or ALLOW_SQLITE_IN_PRODUCTION=true.');
		}

		const weakPg = new Set(['', 'change-me', 'bluemeteor', 'postgres', 'password']);
		if (
			this.cfg.databaseProvider === 'postgresql' &&
			weakPg.has(this.cfg.postgresPassword.toLowerCase())
		) {
			errors.push('Production requires a strong POSTGRES_PASSWORD (non-default).');
		}

		if (this.cfg.agentProvider === 'openai' && !this.cfg.openAiApiKey) {
			errors.push('AGENT_PROVIDER=openai requires OPENAI_API_KEY.');
		}
		if (this.cfg.agentProvider === 'anthropic' && !this.cfg.anthropicApiKey) {
			errors.push('AGENT_PROVIDER=anthropic requires ANTHROPIC_API_KEY.');
		}

		if (this.cfg.allowProviderFallback) {
			errors.push(
				'Production requires AGENT_ALLOW_PROVIDER_FALLBACK=false and ALLOW_PROVIDER_FALLBACK=false (no provider key fallback).',
			);
		}

		return { ok: errors.length === 0, warnings, errors };
	}

	async evaluateAsync(): Promise<StartupValidationResult> {
		const base = this.evaluateSync();
		const warnings = [...base.warnings];
		const errors = [...base.errors];

		try {
			await fs.access(this.cfg.storageRootAbs(), fs.constants.W_OK);
		} catch {
			warnings.push(`Storage root not writable or missing: ${this.cfg.storageRootAbs()}`);
		}

		return { ok: errors.length === 0, warnings, errors };
	}
}
