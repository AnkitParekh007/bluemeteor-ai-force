export interface TicketSummary {
	readonly id: string;
	readonly key?: string;
	readonly title: string;
	readonly status?: string;
	readonly priority?: string;
	readonly updatedAt?: string;
	readonly url?: string;
}

export interface TicketDetail extends TicketSummary {
	readonly description?: string;
	readonly commentsPreview?: string[];
	readonly fields?: Record<string, unknown>;
}
