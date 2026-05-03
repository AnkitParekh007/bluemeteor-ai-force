export type PilotReadinessGateStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'warning';

export type PilotReadinessSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface PilotReadinessCheck {
	readonly id: string;
	readonly category: string;
	readonly title: string;
	readonly description: string;
	readonly status: PilotReadinessGateStatus;
	readonly severity: PilotReadinessSeverity;
	readonly owner?: string;
	readonly recommendation?: string;
}
