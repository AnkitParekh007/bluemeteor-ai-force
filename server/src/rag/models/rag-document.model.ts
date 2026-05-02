export interface RagDocument {
	readonly id: string;
	readonly title: string;
	readonly sourceType: string;
	readonly sourceUri?: string;
	readonly content: string;
	readonly metadata?: Record<string, unknown>;
	readonly createdAt: string;
	readonly updatedAt: string;
}
