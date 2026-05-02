export interface ApiEndpointSummary {
	readonly id: string;
	readonly method: string;
	readonly path: string;
	readonly summary: string;
	readonly tags: string[];
}

export interface ApiEndpointDetail extends ApiEndpointSummary {
	readonly description?: string;
	readonly requestBody?: Record<string, unknown>;
	readonly responses?: Record<string, unknown>;
}
