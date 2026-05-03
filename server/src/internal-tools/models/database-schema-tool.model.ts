export interface DatabaseSchemaOverview {
	readonly title: string;
	readonly tables: string[];
	readonly notes: string[];
}

export interface SchemaSearchResult {
	readonly fragment: string;
	readonly lineNumber: number;
	readonly preview: string;
}

export interface TableSchemaDetail {
	readonly name: string;
	readonly content: string;
}
