export interface PilotFeedbackRecord {
	readonly id: string;
	readonly userId: string | null;
	readonly userEmail: string | null;
	readonly userRole: string;
	readonly agentSlug: string;
	readonly rating: number;
	readonly taskType: string;
	readonly whatWorked: string;
	readonly whatFailed: string;
	readonly timeSavedMinutes: number | null;
	readonly wouldUseAgain: boolean;
	readonly notes: string | null;
	readonly sessionId: string | null;
	readonly runId: string | null;
	readonly traceId: string | null;
	readonly createdAt: Date;
}
