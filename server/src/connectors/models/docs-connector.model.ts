export interface DocSpaceSummary {
	readonly key: string;
	readonly name: string;
	readonly type?: string;
}

export interface DocSummary {
	readonly id: string;
	readonly title: string;
	readonly spaceKey?: string;
	readonly url?: string;
	readonly excerpt?: string;
	readonly updatedAt?: string;
}

export interface DocContent extends DocSummary {
	readonly bodyText: string;
}
