export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketSummary {
	readonly id: string;
	readonly title: string;
	readonly status: TicketStatus;
	readonly priority: TicketPriority;
	readonly area: string;
	readonly createdAt: string;
}

export interface TicketDetail extends TicketSummary {
	readonly description: string;
}

export interface TicketFilter {
	readonly status?: TicketStatus;
	readonly area?: string;
}
