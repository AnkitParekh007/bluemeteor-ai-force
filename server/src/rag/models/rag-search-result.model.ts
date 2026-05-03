export interface RagSearchResult {
	readonly chunkId: string;
	readonly documentId: string;
	readonly documentTitle: string;
	readonly content: string;
	readonly score: number;
}
