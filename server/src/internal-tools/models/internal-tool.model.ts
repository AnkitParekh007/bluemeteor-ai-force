/**
 * Normalized payload returned from InternalToolHubService (and ToolExecutor output).
 */
export interface NormalizedToolOutput {
	readonly title: string;
	readonly summary: string;
	readonly items: unknown[];
	readonly content: string;
	readonly metadata: Record<string, unknown>;
}

export function normalizedToolOutput(
	title: string,
	summary: string,
	items: unknown[] = [],
	content = '',
	metadata: Record<string, unknown> = {},
): NormalizedToolOutput {
	return { title, summary, items, content, metadata };
}
