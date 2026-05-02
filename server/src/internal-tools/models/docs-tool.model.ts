export interface DocSummary {
	readonly path: string;
	readonly title: string;
	readonly size: number;
}

export interface DocContent {
	readonly path: string;
	readonly content: string;
}

export interface DocSearchResult {
	readonly path: string;
	readonly lineNumber: number;
	readonly preview: string;
}
