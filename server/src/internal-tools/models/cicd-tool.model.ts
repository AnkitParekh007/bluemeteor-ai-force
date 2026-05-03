import type { FileSummary } from './repository-tool.model';
import type { RepositoryFileContent } from './repository-tool.model';

export type { FileSummary, RepositoryFileContent };

export interface CicdAnalysis {
	readonly summary: string;
	readonly filesConsidered: string[];
	readonly findings: string[];
	readonly riskHints: string[];
}
