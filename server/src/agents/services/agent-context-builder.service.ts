import { Injectable } from '@nestjs/common';

/**
 * Wraps tool summaries for provider requests — RAG stays on the system prompt path.
 */
@Injectable()
export class AgentContextBuilderService {
	/** Prefixes tool output so models treat it as grounded internal context. */
	buildToolContextForProvider(toolContextBlock?: string): string | undefined {
		if (!toolContextBlock?.trim()) return undefined;
		let body = toolContextBlock.trim();
		if (/\bconnector_/i.test(body)) {
			body =
				'### Connector results (read-only)\n' +
				'Data may come from Bitbucket, GitHub, Jira, Confluence, support systems, or local CI/CD readers. ' +
				'When mock fallback was used, credentials were not configured — treat as illustrative.\n\n' +
				body;
		}
		if (/\bmcp_/i.test(body)) {
			body =
				'### MCP (Model Context Protocol) tool results\n' +
				'Use server id + tool name when citing. Outputs are capped; no writes were executed unless explicitly stated.\n\n' +
				body;
		}
		if (/\b(browser_profile|playwright_run|playwright_spec|test_run|authenticated browser)\b/i.test(body)) {
			body =
				'### Browser profile & Playwright context\n' +
				'Profile status, template keys, and test outcomes may appear below. ' +
				'Never assume cookies, storage state, passwords, or raw tokens are available to the model.\n\n' +
				body;
		}
		return (
			'## Internal read-only tool output\n' +
			'Ground answers in these results (paths, ticket ids, endpoints, tables). No execution was performed.\n\n' +
			body
		);
	}
}
