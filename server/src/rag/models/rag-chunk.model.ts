export interface RagChunk {
	readonly id: string;
	readonly documentId: string;
	readonly content: string;
	readonly chunkIndex: number;
	readonly tokenCount?: number;
	readonly metadata?: Record<string, unknown>;
	readonly createdAt: string;
}
