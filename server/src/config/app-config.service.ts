import * as path from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
	constructor(private readonly config: ConfigService) {}

	// ——— Deployment / database ———

	get databaseProvider(): 'sqlite' | 'postgresql' {
		const v = (this.config.get<string>('DATABASE_PROVIDER') ?? 'sqlite').toLowerCase();
		return v === 'postgresql' || v === 'postgres' ? 'postgresql' : 'sqlite';
	}

	/** Raw URL from env — never log. */
	get databaseUrl(): string {
		return (this.config.get<string>('DATABASE_URL') ?? 'file:./dev.db').trim();
	}

	get postgresHost(): string {
		return (this.config.get<string>('POSTGRES_HOST') ?? 'localhost').trim();
	}

	get postgresPort(): number {
		return Number(this.config.get<string>('POSTGRES_PORT') ?? 5432);
	}

	get postgresDb(): string {
		return (this.config.get<string>('POSTGRES_DB') ?? 'bluemeteor_ai_force').trim();
	}

	get postgresUser(): string {
		return (this.config.get<string>('POSTGRES_USER') ?? 'bluemeteor').trim();
	}

	get postgresPassword(): string {
		return (this.config.get<string>('POSTGRES_PASSWORD') ?? '').trim();
	}

	get postgresSsl(): boolean {
		return this.config.get<string>('POSTGRES_SSL') === 'true';
	}

	get prismaLogQueries(): boolean {
		return this.config.get<string>('PRISMA_LOG_QUERIES') === 'true';
	}

	get databaseConnectionTimeoutMs(): number {
		return Number(this.config.get<string>('DATABASE_CONNECTION_TIMEOUT_MS') ?? 10_000);
	}

	get allowSqliteInProduction(): boolean {
		return this.config.get<string>('ALLOW_SQLITE_IN_PRODUCTION') === 'true';
	}

	/** Root directory for runtime files (relative to cwd unless absolute). */
	get storageRoot(): string {
		return (this.config.get<string>('STORAGE_ROOT') ?? 'storage').trim() || 'storage';
	}

	storageRootAbs(): string {
		const r = this.storageRoot;
		return path.isAbsolute(r) ? r : path.resolve(process.cwd(), r);
	}

	/**
	 * Resolve a storage path from env (e.g. BROWSER_SCREENSHOT_DIR).
	 * Strips a leading `storage/` so values stay under STORAGE_ROOT.
	 */
	resolveStoragePath(configKey: string, defaultRelative: string): string {
		const raw = (this.config.get<string>(configKey) ?? defaultRelative).trim() || defaultRelative;
		if (path.isAbsolute(raw)) return raw;
		const stripped = raw.replace(/^\/?storage\/?/i, '').replace(/^[/\\]+/, '');
		return path.join(this.storageRootAbs(), stripped);
	}

	get apiGlobalPrefix(): string {
		return (this.config.get<string>('API_GLOBAL_PREFIX') ?? '').trim().replace(/^\/+|\/+$/g, '');
	}

	get enableMetrics(): boolean {
		return this.config.get<string>('ENABLE_METRICS') !== 'false';
	}

	get metricsPublic(): boolean {
		return this.config.get<string>('METRICS_PUBLIC') === 'true';
	}

	get appVersion(): string {
		return (this.config.get<string>('APP_VERSION') ?? '0.0.1').trim();
	}

	get structuredLogging(): boolean {
		return this.config.get<string>('STRUCTURED_LOGGING') === 'true' || !this.isDevelopment;
	}

	// ——— Internal read-only tool hub ———

	get enableInternalTools(): boolean {
		return this.config.get<string>('ENABLE_INTERNAL_TOOLS') !== 'false';
	}

	get enableRepositoryReader(): boolean {
		return this.enableInternalTools && this.config.get<string>('ENABLE_REPOSITORY_READER') !== 'false';
	}

	get enableDocsReader(): boolean {
		return this.enableInternalTools && this.config.get<string>('ENABLE_DOCS_READER') !== 'false';
	}

	get enableTicketReader(): boolean {
		return this.enableInternalTools && this.config.get<string>('ENABLE_TICKET_READER') !== 'false';
	}

	get enableApiCatalogReader(): boolean {
		return this.enableInternalTools && this.config.get<string>('ENABLE_API_CATALOG_READER') !== 'false';
	}

	get enableDatabaseSchemaReader(): boolean {
		return this.enableInternalTools && this.config.get<string>('ENABLE_DATABASE_SCHEMA_READER') !== 'false';
	}

	get enableCicdReader(): boolean {
		return this.enableInternalTools && this.config.get<string>('ENABLE_CICD_READER') !== 'false';
	}

	get enableMcpAdapter(): boolean {
		return this.config.get<string>('ENABLE_MCP_ADAPTER') === 'true';
	}

	get mcpServerStartupTimeoutMs(): number {
		return Number(this.config.get<string>('MCP_SERVER_STARTUP_TIMEOUT_MS') ?? 15_000);
	}

	get mcpToolCallTimeoutMs(): number {
		return Number(this.config.get<string>('MCP_TOOL_CALL_TIMEOUT_MS') ?? 30_000);
	}

	get mcpMaxOutputChars(): number {
		return Number(this.config.get<string>('MCP_MAX_OUTPUT_CHARS') ?? 50_000);
	}

	get mcpAllowStdio(): boolean {
		return this.config.get<string>('MCP_ALLOW_STDIO') !== 'false';
	}

	get mcpAllowHttp(): boolean {
		return this.config.get<string>('MCP_ALLOW_HTTP') === 'true';
	}

	get mcpAllowSse(): boolean {
		return this.config.get<string>('MCP_ALLOW_SSE') === 'true';
	}

	get mcpAllowWriteTools(): boolean {
		return this.config.get<string>('MCP_ALLOW_WRITE_TOOLS') === 'true';
	}

	get mcpAllowedCommands(): string[] {
		const raw = this.config.get<string>('MCP_ALLOWED_COMMANDS') ?? 'npx,node,bun,python';
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	/** Base directory for MCP server cwd (resolved under repository root). */
	get mcpWorkingDirectoryAbs(): string {
		const rel = this.config.get<string>('MCP_WORKING_DIRECTORY') ?? '.';
		return path.resolve(this.repositoryRootAbs, rel.replace(/^[/\\]+/, ''));
	}

	get mcpDebugLogs(): boolean {
		return this.config.get<string>('MCP_DEBUG_LOGS') === 'true';
	}

	/** When true and NODE_ENV=development, failed stdio connects can fall back to demo MCP tools. */
	get mcpUseMockClientOnFailure(): boolean {
		return this.config.get<string>('MCP_USE_MOCK_CLIENT_ON_FAILURE') === 'true';
	}

	// ——— Connector hub (read-only; credentials server-side only) ———

	get enableConnectors(): boolean {
		return this.config.get<string>('ENABLE_CONNECTORS') !== 'false';
	}

	get enableConnectorMockFallback(): boolean {
		return this.config.get<string>('ENABLE_CONNECTOR_MOCK_FALLBACK') !== 'false';
	}

	get connectorHttpTimeoutMs(): number {
		return Number(this.config.get<string>('CONNECTOR_HTTP_TIMEOUT_MS') ?? 15_000);
	}

	get connectorMaxResults(): number {
		return Number(this.config.get<string>('CONNECTOR_MAX_RESULTS') ?? 20);
	}

	get connectorMaxContentChars(): number {
		return Number(this.config.get<string>('CONNECTOR_MAX_CONTENT_CHARS') ?? 60_000);
	}

	get enableBitbucketConnector(): boolean {
		return this.enableConnectors && this.config.get<string>('ENABLE_BITBUCKET_CONNECTOR') === 'true';
	}

	get bitbucketBaseUrl(): string {
		return (this.config.get<string>('BITBUCKET_BASE_URL') ?? 'https://api.bitbucket.org/2.0').replace(/\/$/, '');
	}

	get bitbucketWorkspace(): string {
		return (this.config.get<string>('BITBUCKET_WORKSPACE') ?? '').trim();
	}

	get bitbucketUsername(): string {
		return (this.config.get<string>('BITBUCKET_USERNAME') ?? '').trim();
	}

	/** App password — never log or expose. */
	get bitbucketAppPassword(): string {
		return (this.config.get<string>('BITBUCKET_APP_PASSWORD') ?? '').trim();
	}

	get bitbucketDefaultRepo(): string {
		return (this.config.get<string>('BITBUCKET_DEFAULT_REPO') ?? '').trim();
	}

	get bitbucketAllowedRepos(): string[] {
		const raw = this.config.get<string>('BITBUCKET_ALLOWED_REPOS') ?? '';
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	get enableGithubConnector(): boolean {
		return this.enableConnectors && this.config.get<string>('ENABLE_GITHUB_CONNECTOR') === 'true';
	}

	get githubBaseUrl(): string {
		return (this.config.get<string>('GITHUB_BASE_URL') ?? 'https://api.github.com').replace(/\/$/, '');
	}

	/** PAT — never log or expose. */
	get githubToken(): string {
		return (this.config.get<string>('GITHUB_TOKEN') ?? '').trim();
	}

	get githubDefaultOwner(): string {
		return (this.config.get<string>('GITHUB_DEFAULT_OWNER') ?? '').trim();
	}

	get githubAllowedRepos(): string[] {
		const raw = this.config.get<string>('GITHUB_ALLOWED_REPOS') ?? '';
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	get enableJiraConnector(): boolean {
		return this.enableConnectors && this.config.get<string>('ENABLE_JIRA_CONNECTOR') === 'true';
	}

	get jiraBaseUrl(): string {
		return (this.config.get<string>('JIRA_BASE_URL') ?? '').trim().replace(/\/$/, '');
	}

	get jiraEmail(): string {
		return (this.config.get<string>('JIRA_EMAIL') ?? '').trim();
	}

	/** API token — never log or expose. */
	get jiraApiToken(): string {
		return (this.config.get<string>('JIRA_API_TOKEN') ?? '').trim();
	}

	get jiraProjectKeys(): string[] {
		const raw = this.config.get<string>('JIRA_PROJECT_KEYS') ?? '';
		return raw
			.split(',')
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean);
	}

	get enableConfluenceConnector(): boolean {
		return this.enableConnectors && this.config.get<string>('ENABLE_CONFLUENCE_CONNECTOR') === 'true';
	}

	get confluenceBaseUrl(): string {
		return (this.config.get<string>('CONFLUENCE_BASE_URL') ?? '').trim().replace(/\/$/, '');
	}

	get confluenceEmail(): string {
		return (this.config.get<string>('CONFLUENCE_EMAIL') ?? '').trim();
	}

	/** API token — never log or expose. */
	get confluenceApiToken(): string {
		return (this.config.get<string>('CONFLUENCE_API_TOKEN') ?? '').trim();
	}

	get confluenceSpaceKeys(): string[] {
		const raw = this.config.get<string>('CONFLUENCE_SPACE_KEYS') ?? '';
		return raw
			.split(',')
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean);
	}

	get enableSupportConnector(): boolean {
		return this.enableConnectors && this.config.get<string>('ENABLE_SUPPORT_CONNECTOR') === 'true';
	}

	get supportConnectorProvider(): 'mock' | 'zendesk' | 'servicenow' {
		const v = (this.config.get<string>('SUPPORT_CONNECTOR_PROVIDER') ?? 'mock').toLowerCase();
		if (v === 'zendesk' || v === 'servicenow') return v;
		return 'mock';
	}

	get zendeskBaseUrl(): string {
		return (this.config.get<string>('ZENDESK_BASE_URL') ?? '').trim().replace(/\/$/, '');
	}

	get zendeskEmail(): string {
		return (this.config.get<string>('ZENDESK_EMAIL') ?? '').trim();
	}

	get zendeskApiToken(): string {
		return (this.config.get<string>('ZENDESK_API_TOKEN') ?? '').trim();
	}

	get servicenowBaseUrl(): string {
		return (this.config.get<string>('SERVICENOW_BASE_URL') ?? '').trim().replace(/\/$/, '');
	}

	get servicenowUsername(): string {
		return (this.config.get<string>('SERVICENOW_USERNAME') ?? '').trim();
	}

	get servicenowPassword(): string {
		return (this.config.get<string>('SERVICENOW_PASSWORD') ?? '').trim();
	}

	get enableCicdConnector(): boolean {
		return this.enableConnectors && this.config.get<string>('ENABLE_CICD_CONNECTOR') !== 'false';
	}

	get cicdConnectorProvider(): string {
		return (this.config.get<string>('CICD_PROVIDER') ?? 'local').trim();
	}

	get repositoryProvider(): string {
		return this.config.get<string>('REPOSITORY_PROVIDER') ?? 'local';
	}

	/** Absolute path to repository root (monorepo / project root). */
	get repositoryRootAbs(): string {
		const rel = this.config.get<string>('REPOSITORY_ROOT') ?? '..';
		return path.resolve(process.cwd(), rel);
	}

	get repositoryAllowedPaths(): string[] {
		const raw =
			this.config.get<string>('REPOSITORY_ALLOWED_PATHS') ??
			'src,server,docs,README.md,package.json,angular.json';
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	get docsRootRelative(): string {
		return this.config.get<string>('DOCS_ROOT') ?? 'docs';
	}

	get ticketsProvider(): string {
		return this.config.get<string>('TICKETS_PROVIDER') ?? 'mock';
	}

	get apiCatalogPathRelative(): string {
		return this.config.get<string>('API_CATALOG_PATH') ?? 'docs/api-catalog.json';
	}

	get databaseSchemaPathRelative(): string {
		return this.config.get<string>('DATABASE_SCHEMA_PATH') ?? 'docs/database-schema.md';
	}

	get cicdAllowedFiles(): string[] {
		const raw =
			this.config.get<string>('CICD_ALLOWED_FILES') ??
			'.github,bitbucket-pipelines.yml,server/package.json,package.json,angular.json';
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	get mcpConfigPathRelative(): string {
		return this.config.get<string>('MCP_CONFIG_PATH') ?? 'server/mcp.config.json';
	}

	get maxToolFileReadBytes(): number {
		return Number(this.config.get<string>('MAX_TOOL_FILE_READ_BYTES') ?? 200_000);
	}

	/** Resolved path under repository root for a configured relative file (api catalog, schema, etc.). */
	resolveRepoFile(relativePath: string): string {
		return path.resolve(this.repositoryRootAbs, relativePath.replace(/^[/\\]+/, ''));
	}

	get port(): number {
		return Number(this.config.get<string>('PORT') ?? 3000);
	}

	get nodeEnv(): string {
		return this.config.get<string>('NODE_ENV') ?? 'development';
	}

	get isDevelopment(): boolean {
		return this.nodeEnv !== 'production';
	}

	get corsOrigin(): string {
		return this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:4200';
	}

	get agentProvider(): 'mock' | 'openai' | 'anthropic' | 'local' {
		const v = (this.config.get<string>('AGENT_PROVIDER') ?? 'mock').toLowerCase();
		if (v === 'openai' || v === 'anthropic' || v === 'local') return v;
		return 'mock';
	}

	get streamingEnabled(): boolean {
		return this.config.get<string>('AGENT_STREAMING_ENABLED') !== 'false';
	}

	/** True when missing API keys may fall back to mock in development. */
	get allowProviderFallback(): boolean {
		const a = this.config.get<string>('AGENT_ALLOW_PROVIDER_FALLBACK');
		const b = this.config.get<string>('ALLOW_PROVIDER_FALLBACK');
		const raw = a ?? b ?? 'true';
		return raw !== 'false';
	}

	get maxMessageChars(): number {
		return Number(this.config.get<string>('AGENT_MAX_MESSAGE_CHARS') ?? 12000);
	}

	get enableDebugRuntimeLogs(): boolean {
		return this.config.get<string>('ENABLE_DEBUG_RUNTIME_LOGS') === 'true';
	}

	get openAiApiKey(): string | undefined {
		const k = this.config.get<string>('OPENAI_API_KEY');
		return k && k.trim().length > 0 ? k.trim() : undefined;
	}

	get openAiModel(): string {
		return this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
	}

	get anthropicApiKey(): string | undefined {
		const k = this.config.get<string>('ANTHROPIC_API_KEY');
		return k && k.trim().length > 0 ? k.trim() : undefined;
	}

	get anthropicModel(): string {
		return this.config.get<string>('ANTHROPIC_MODEL') ?? 'claude-3-5-sonnet-latest';
	}

	get localModelBaseUrl(): string {
		return this.config.get<string>('LOCAL_MODEL_BASE_URL') ?? 'http://localhost:11434';
	}

	get localModelName(): string {
		return this.config.get<string>('LOCAL_MODEL_NAME') ?? 'llama3.1';
	}

	get enableApprovalGates(): boolean {
		return this.config.get<string>('ENABLE_APPROVAL_GATES') !== 'false';
	}

	get enableAuditLogs(): boolean {
		return this.config.get<string>('ENABLE_AUDIT_LOGS') !== 'false';
	}

	/** Playwright-backed worker (Chromium). Still gated by ENABLE_REAL_BROWSER_ACTIONS for mutations. */
	get enableBrowserWorker(): boolean {
		return this.config.get<string>('ENABLE_BROWSER_WORKER') === 'true';
	}

	get enableRealBrowserActions(): boolean {
		return this.config.get<string>('ENABLE_REAL_BROWSER_ACTIONS') === 'true';
	}

	get browserHeadless(): boolean {
		return this.config.get<string>('BROWSER_HEADLESS') !== 'false';
	}

	get browserDefaultUrl(): string {
		return this.config.get<string>('BROWSER_DEFAULT_URL') ?? 'http://localhost:4200';
	}

	get browserAllowedOrigins(): string[] {
		const raw =
			this.config.get<string>('BROWSER_ALLOWED_ORIGINS') ??
			'http://localhost:4200,http://localhost:4300';
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	get browserSessionTimeoutMs(): number {
		return Number(this.config.get<string>('BROWSER_SESSION_TIMEOUT_MS') ?? 900000);
	}

	get browserActionTimeoutMs(): number {
		return Number(this.config.get<string>('BROWSER_ACTION_TIMEOUT_MS') ?? 15000);
	}

	get browserMaxActionsPerRun(): number {
		return Number(this.config.get<string>('BROWSER_MAX_ACTIONS_PER_RUN') ?? 25);
	}

	get browserScreenshotEnabled(): boolean {
		return this.config.get<string>('BROWSER_SCREENSHOT_ENABLED') !== 'false';
	}

	get browserScreenshotDir(): string {
		return this.resolveStoragePath('BROWSER_SCREENSHOT_DIR', 'browser-screenshots');
	}

	/** Authenticated browser profiles (storage state on disk). Default off. */
	get enableAuthenticatedBrowserSessions(): boolean {
		return this.config.get<string>('ENABLE_AUTHENTICATED_BROWSER_SESSIONS') === 'true';
	}

	get browserAuthStateDir(): string {
		return this.resolveStoragePath('BROWSER_AUTH_STATE_DIR', 'browser-auth-states');
	}

	get browserSessionProfileDir(): string {
		return this.resolveStoragePath('BROWSER_SESSION_PROFILE_DIR', 'browser-profiles');
	}

	get browserRecordVideo(): boolean {
		return this.config.get<string>('BROWSER_RECORD_VIDEO') === 'true';
	}

	get browserVideoDir(): string {
		return this.resolveStoragePath('BROWSER_VIDEO_DIR', 'browser-videos');
	}

	get browserTraceEnabled(): boolean {
		return this.config.get<string>('BROWSER_TRACE_ENABLED') === 'true';
	}

	get browserTraceDir(): string {
		return this.resolveStoragePath('BROWSER_TRACE_DIR', 'browser-traces');
	}

	get testTargetBaseUrl(): string {
		return (this.config.get<string>('TEST_TARGET_BASE_URL') ?? this.browserDefaultUrl).trim();
	}

	get testTargetLoginUrl(): string {
		return (this.config.get<string>('TEST_TARGET_LOGIN_URL') ?? `${this.testTargetBaseUrl.replace(/\/$/, '')}/login`).trim();
	}

	get testTargetAllowedOrigins(): string[] {
		const raw =
			this.config.get<string>('TEST_TARGET_ALLOWED_ORIGINS') ??
			this.config.get<string>('BROWSER_ALLOWED_ORIGINS') ??
			'http://localhost:4200,http://localhost:4300';
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	get testTargetEnvironment(): string {
		return (this.config.get<string>('TEST_TARGET_ENVIRONMENT') ?? 'local').trim().toLowerCase();
	}

	get enableDemoBrowserLogin(): boolean {
		return this.config.get<string>('ENABLE_DEMO_BROWSER_LOGIN') === 'true';
	}

	get demoBrowserUsername(): string {
		return (this.config.get<string>('DEMO_BROWSER_USERNAME') ?? 'bluemeteor').trim();
	}

	/** Demo password — never log or return to clients. */
	get demoBrowserPassword(): string {
		return (this.config.get<string>('DEMO_BROWSER_PASSWORD') ?? 'bluemeteor').trim();
	}

	get playwrightTestOutputDir(): string {
		return this.resolveStoragePath('PLAYWRIGHT_TEST_OUTPUT_DIR', 'playwright-results');
	}

	get playwrightGeneratedSpecDir(): string {
		return this.resolveStoragePath('PLAYWRIGHT_GENERATED_SPEC_DIR', 'generated-tests');
	}

	get playwrightMaxTestDurationMs(): number {
		return Number(
			this.config.get<string>('PLAYWRIGHT_MAX_TEST_DURATION_MS') ??
				this.config.get<string>('TEST_RUN_TIMEOUT_MS') ??
				120_000,
		);
	}

	get playwrightMaxTestsPerRun(): number {
		return Number(this.config.get<string>('PLAYWRIGHT_MAX_TESTS_PER_RUN') ?? 10);
	}

	get playwrightAllowedTestTemplates(): string[] {
		const raw =
			this.config.get<string>('PLAYWRIGHT_ALLOWED_TEST_TEMPLATES') ??
			'login_smoke,dashboard_smoke,supplier_upload_smoke';
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	get playwrightCaptureScreenshotOnFailure(): boolean {
		return this.config.get<string>('PLAYWRIGHT_CAPTURE_SCREENSHOT_ON_FAILURE') !== 'false';
	}

	get playwrightCaptureTraceOnFailure(): boolean {
		return this.config.get<string>('PLAYWRIGHT_CAPTURE_TRACE_ON_FAILURE') === 'true';
	}

	get allowTestsAgainstProduction(): boolean {
		return this.config.get<string>('ALLOW_TESTS_AGAINST_PRODUCTION') === 'true';
	}

	get requireApprovalForAuthBrowser(): boolean {
		return this.config.get<string>('REQUIRE_APPROVAL_FOR_AUTH_BROWSER') !== 'false';
	}

	get requireApprovalForRealTestRun(): boolean {
		return this.config.get<string>('REQUIRE_APPROVAL_FOR_REAL_TEST_RUN') !== 'false';
	}

	/**
	 * Throws when test execution would target production without explicit opt-in.
	 * Use for template runs and authenticated browser against TEST_TARGET_*.
	 */
	assertTestTargetAllowsExecution(): void {
		const env = this.testTargetEnvironment;
		if (env === 'production' && !this.allowTestsAgainstProduction) {
			throw new Error(
				'Tests against production are blocked (TEST_TARGET_ENVIRONMENT=production, ALLOW_TESTS_AGAINST_PRODUCTION=false).',
			);
		}
	}

	/** Demo automated login is only allowed for local-style targets. */
	isDemoBrowserLoginTargetSafe(): boolean {
		if (!this.enableDemoBrowserLogin) return false;
		if (this.testTargetEnvironment === 'production') return false;
		try {
			const base = new URL(this.testTargetBaseUrl);
			const host = base.hostname;
			if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return true;
		} catch {
			return false;
		}
		return false;
	}

	get enableTestWorker(): boolean {
		return this.config.get<string>('ENABLE_TEST_WORKER') !== 'false';
	}

	get enableRealPlaywrightTests(): boolean {
		return this.config.get<string>('ENABLE_REAL_PLAYWRIGHT_TESTS') === 'true';
	}

	get testRunTimeoutMs(): number {
		return this.playwrightMaxTestDurationMs;
	}

	get enableToolApprovals(): boolean {
		return this.config.get<string>('ENABLE_TOOL_APPROVALS') !== 'false';
	}

	get autoApproveLowRiskTools(): boolean {
		return this.config.get<string>('AUTO_APPROVE_LOW_RISK_TOOLS') !== 'false';
	}

	get blockHighRiskToolsWithoutApproval(): boolean {
		return this.config.get<string>('BLOCK_HIGH_RISK_TOOLS_WITHOUT_APPROVAL') !== 'false';
	}

	// ——— Auth / JWT ———

	get jwtAccessSecret(): string {
		const s = this.config.get<string>('JWT_ACCESS_SECRET');
		if (s != null && s.trim() !== '') return s.trim();
		// Avoid 500s on /auth/login when .env is minimal in local dev.
		if (this.isDevelopment) return 'dev-only-jwt-access-secret';
		return '';
	}

	get jwtRefreshSecret(): string {
		const s = this.config.get<string>('JWT_REFRESH_SECRET');
		if (s != null && s.trim() !== '') return s.trim();
		if (this.isDevelopment) return 'dev-only-jwt-refresh-secret';
		return '';
	}

	get jwtAccessExpiresIn(): string {
		return this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
	}

	get jwtRefreshExpiresIn(): string {
		return this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
	}

	/** Dedicated secret for short-lived SSE stream tokens (not the access JWT secret). */
	get streamTokenSecret(): string {
		const s = this.config.get<string>('STREAM_TOKEN_SECRET');
		if (s != null && s.trim() !== '') return s.trim();
		if (this.isDevelopment) return `${this.jwtAccessSecret}:stream`;
		return '';
	}

	get streamTokenTtlSeconds(): number {
		return Number(this.config.get<string>('STREAM_TOKEN_TTL_SECONDS') ?? 300);
	}

	get enableDirectBrowserDebugEndpoints(): boolean {
		return this.config.get<string>('ENABLE_DIRECT_BROWSER_DEBUG_ENDPOINTS') === 'true';
	}

	get seedDefaultAdmin(): boolean {
		return this.config.get<string>('SEED_DEFAULT_ADMIN') === 'true';
	}

	get allowMockFallbackInProduction(): boolean {
		return this.config.get<string>('ALLOW_MOCK_FALLBACK_IN_PRODUCTION') === 'true';
	}

	get browserAssetRetentionDays(): number {
		return Number(this.config.get<string>('BROWSER_ASSET_RETENTION_DAYS') ?? 7);
	}

	get testAssetRetentionDays(): number {
		return Number(this.config.get<string>('TEST_ASSET_RETENTION_DAYS') ?? 7);
	}

	get enableStorageCleanup(): boolean {
		return this.config.get<string>('ENABLE_STORAGE_CLEANUP') !== 'false';
	}

	get authDemoUsersEnabled(): boolean {
		return this.config.get<string>('AUTH_DEMO_USERS_ENABLED') !== 'false';
	}

	get authRequireStrongPassword(): boolean {
		return this.config.get<string>('AUTH_REQUIRE_STRONG_PASSWORD') === 'true';
	}

	get bcryptSaltRounds(): number {
		return Number(this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? 10);
	}

	get enableRbac(): boolean {
		return this.config.get<string>('ENABLE_RBAC') !== 'false';
	}

	get enableRateLimiting(): boolean {
		return this.config.get<string>('ENABLE_RATE_LIMITING') !== 'false';
	}

	get rateLimitTtlSeconds(): number {
		return Number(this.config.get<string>('RATE_LIMIT_TTL_SECONDS') ?? 60);
	}

	get rateLimitMaxRequests(): number {
		return Number(this.config.get<string>('RATE_LIMIT_MAX_REQUESTS') ?? 120);
	}

	get agentRateLimitMaxRequests(): number {
		return Number(this.config.get<string>('AGENT_RATE_LIMIT_MAX_REQUESTS') ?? 30);
	}

	get browserRateLimitMaxRequests(): number {
		return Number(this.config.get<string>('BROWSER_RATE_LIMIT_MAX_REQUESTS') ?? 20);
	}

	get defaultAdminEmail(): string {
		return this.config.get<string>('DEFAULT_ADMIN_EMAIL') ?? 'admin@bluemeteor.local';
	}

	get defaultAdminPassword(): string {
		return this.config.get<string>('DEFAULT_ADMIN_PASSWORD') ?? 'admin123';
	}

	get defaultAdminName(): string {
		return this.config.get<string>('DEFAULT_ADMIN_NAME') ?? 'Admin User';
	}

	/**
	 * In production, JWT secrets must be set and must not be placeholder values.
	 * Call from bootstrap before listen().
	 */
	validateAuthSecretsForProduction(): void {
		if (this.isDevelopment) return;

		const weak = new Set([
			'',
			'change-me-access-secret',
			'change-me-refresh-secret',
			'change-me-stream-secret',
			'changeme',
			'secret',
			'admin123',
		]);

		const a = this.jwtAccessSecret.trim();
		const r = this.jwtRefreshSecret.trim();
		if (!a || !r || weak.has(a) || weak.has(r) || a === r || a.length < 32 || r.length < 32) {
			throw new Error(
				'Production requires strong JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (distinct, ≥32 chars, non-default).',
			);
		}

		const st = this.streamTokenSecret.trim();
		if (
			!st ||
			weak.has(st) ||
			st === a ||
			st === r ||
			st.endsWith(':stream') ||
			st.length < 32
		) {
			throw new Error(
				'Production requires STREAM_TOKEN_SECRET (dedicated, ≥32 chars, not default or dev-suffix).',
			);
		}

		if (this.defaultAdminPassword.toLowerCase() === 'admin123' || weak.has(this.defaultAdminPassword)) {
			throw new Error('Production requires DEFAULT_ADMIN_PASSWORD to be strong (not admin123 or placeholders).');
		}

		if (this.authDemoUsersEnabled) {
			throw new Error('Production requires AUTH_DEMO_USERS_ENABLED=false.');
		}

		if (this.mcpUseMockClientOnFailure) {
			throw new Error('Production requires MCP_USE_MOCK_CLIENT_ON_FAILURE=false.');
		}

		if (this.enableDirectBrowserDebugEndpoints) {
			throw new Error('Production requires ENABLE_DIRECT_BROWSER_DEBUG_ENDPOINTS=false.');
		}

		if (this.enableConnectorMockFallback && !this.allowMockFallbackInProduction) {
			throw new Error(
				'Production requires ENABLE_CONNECTOR_MOCK_FALLBACK=false unless ALLOW_MOCK_FALLBACK_IN_PRODUCTION=true.',
			);
		}

		const cors = this.corsOrigin.split(',').map((s) => s.trim());
		if (cors.includes('*')) {
			throw new Error('Production CORS_ORIGIN must not be "*".');
		}
	}
}
