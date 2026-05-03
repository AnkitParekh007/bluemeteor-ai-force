export interface RepositorySummary {
	readonly id: string;
	readonly name: string;
	readonly slug: string;
	readonly fullName: string;
	readonly description?: string;
	readonly project?: string;
	readonly links?: Record<string, unknown>;
}

export interface RepositoryDetail extends RepositorySummary {
	readonly isPrivate?: boolean;
	readonly mainbranch?: string;
}

export interface BranchSummary {
	readonly name: string;
	readonly target?: string;
}

export interface RepositoryFileSummary {
	readonly path: string;
	readonly type: 'file' | 'dir';
	readonly size?: number;
}

export interface RepositoryFileContent {
	readonly repoSlug: string;
	readonly path: string;
	readonly branch: string;
	readonly content: string;
	readonly language: string;
	readonly size: number;
}

export interface RepositorySearchResult {
	readonly path: string;
	readonly line?: number;
	readonly snippet: string;
}

export interface PullRequestSummary {
	readonly id: string;
	readonly title: string;
	readonly state: string;
	readonly author: string;
	readonly sourceBranch: string;
	readonly targetBranch: string;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly url: string;
}

export interface PullRequestDetail extends PullRequestSummary {
	readonly body?: string;
}

export interface CommitSummary {
	readonly hash: string;
	readonly message: string;
	readonly author: string;
	readonly date: string;
	readonly url?: string;
}
