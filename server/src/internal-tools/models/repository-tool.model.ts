export interface FileSummary {
	readonly path: string;
	readonly name: string;
	readonly extension: string;
	readonly size: number;
	readonly modifiedAt?: string;
}

export interface RepositoryFileContent {
	readonly path: string;
	readonly content: string;
	readonly language: string;
	readonly size: number;
}

export interface RepositorySearchResult {
	readonly path: string;
	readonly lineNumber: number;
	readonly preview: string;
	readonly score: number;
}

export interface RepositoryOverview {
	readonly projectType: string;
	readonly packageJsonSummary?: Record<string, unknown>;
	readonly angularProjects: string[];
	readonly serverModules: string[];
	readonly docsAvailable: boolean;
	readonly importantFiles: string[];
}
