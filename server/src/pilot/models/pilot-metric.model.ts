export type PilotMetricStatus = 'good' | 'warning' | 'bad' | 'unknown';

export interface PilotMetricSnapshot {
	readonly id: string;
	readonly label: string;
	readonly value: string | number;
	readonly target?: string | number;
	readonly status: PilotMetricStatus;
	readonly description?: string;
}
