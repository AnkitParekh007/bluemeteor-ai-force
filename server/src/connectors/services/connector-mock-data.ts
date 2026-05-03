import type { RepositoryFileContent, RepositorySearchResult, RepositorySummary } from '../models/repository-connector.model';
import type { PullRequestSummary, CommitSummary } from '../models/repository-connector.model';
import type { TicketSummary, TicketDetail } from '../models/ticket-connector.model';
import type { DocSummary, DocContent } from '../models/docs-connector.model';
import type { CicdAnalysis } from '../../internal-tools/models/cicd-tool.model';

export const MOCK_REPO_SUMMARIES: RepositorySummary[] = [
	{
		id: 'supplier-portal-ui',
		name: 'supplier-portal-ui',
		slug: 'supplier-portal-ui',
		fullName: 'acme/supplier-portal-ui',
		description: 'Angular supplier portal UI',
	},
	{
		id: 'supplier-portal-api',
		name: 'supplier-portal-api',
		slug: 'supplier-portal-api',
		fullName: 'acme/supplier-portal-api',
		description: 'NestJS supplier APIs',
	},
	{
		id: 'bluemeteor-ai-force',
		name: 'bluemeteor-ai-force',
		slug: 'bluemeteor-ai-force',
		fullName: 'acme/bluemeteor-ai-force',
		description: 'Internal agent workspace',
	},
];

export function mockRepoFile(repoSlug: string, path: string, branch: string): RepositoryFileContent {
	const safePath = path || 'src/app/app.component.ts';
	return {
		repoSlug,
		path: safePath,
		branch: branch || 'main',
		language: 'typescript',
		size: 1200,
		content: `// Mock connector file preview for ${repoSlug}\n// Path: ${safePath}\n@Component({\n  selector: 'app-supplier-upload',\n  standalone: true,\n  templateUrl: './supplier-upload.component.html',\n})\nexport class SupplierUploadComponent {}\n`,
	};
}

export function mockRepoSearch(query: string): RepositorySearchResult[] {
	return [
		{ path: 'src/app/features/supplier-upload/supplier-upload.component.ts', line: 12, snippet: `// ${query} — upload form validation` },
		{ path: 'src/app/core/services/upload-api.service.ts', line: 4, snippet: `postSupplierUpload()` },
	];
}

export const MOCK_JIRA_TICKETS: TicketSummary[] = [
	{ id: '10001', key: 'SUP-101', title: 'Supplier upload failed for large CSV', status: 'Open', priority: 'High', updatedAt: new Date().toISOString() },
	{ id: '10002', key: 'SUP-102', title: 'Login issue after SSO change', status: 'In Progress', priority: 'Medium', updatedAt: new Date().toISOString() },
	{ id: '10003', key: 'SUP-103', title: 'SKU status incorrect after syndication', status: 'Open', priority: 'High', updatedAt: new Date().toISOString() },
	{ id: '10004', key: 'SUP-104', title: 'Syndication delay > 2 hours', status: 'To Do', priority: 'Low', updatedAt: new Date().toISOString() },
	{ id: '10005', key: 'SUP-105', title: 'Dashboard statistics mismatch vs warehouse', status: 'Open', priority: 'Medium', updatedAt: new Date().toISOString() },
];

export function mockJiraDetail(key: string): TicketDetail {
	const base = MOCK_JIRA_TICKETS.find((t) => t.key === key) ?? MOCK_JIRA_TICKETS[0]!;
	return {
		...base,
		description: 'Steps: upload sample.csv → 500 from /api/supplier/upload. Expected 200.',
		commentsPreview: ['Reproduced on staging', 'Assigning to platform'],
	};
}

export const MOCK_CONFLUENCE: DocSummary[] = [
	{ id: '111', title: 'Supplier Portal — Upload workflow', spaceKey: 'ENG', excerpt: 'CSV validation, async job, notifications', updatedAt: new Date().toISOString() },
	{ id: '112', title: 'Supplier Portal — Troubleshooting', spaceKey: 'ENG', excerpt: 'Common upload failures and fixes', updatedAt: new Date().toISOString() },
];

export function mockConfluencePage(id: string): DocContent {
	const s = MOCK_CONFLUENCE.find((x) => x.id === id) ?? MOCK_CONFLUENCE[0]!;
	return {
		...s,
		bodyText: '## Upload workflow\n1. Validate headers\n2. Queue job\n3. Notify supplier\n\n(Mock connector content — configure Confluence for live pages.)',
	};
}

export const MOCK_SUPPORT: TicketSummary[] = [
	{ id: 'z-9001', key: 'z-9001', title: 'Customer: upload fails with "network error"', status: 'open', updatedAt: new Date().toISOString() },
	{ id: 'z-9002', key: 'z-9002', title: 'Customer: cannot see uploaded files', status: 'pending', updatedAt: new Date().toISOString() },
];

export function mockSupportDetail(id: string): TicketDetail {
	const s = MOCK_SUPPORT.find((t) => t.id === id || t.key === id) ?? MOCK_SUPPORT[0]!;
	return { ...s, description: 'Customer reports intermittent failure during supplier CSV upload (mock).' };
}

export const MOCK_PRS: PullRequestSummary[] = [
	{
		id: '42',
		title: 'Fix supplier upload validation',
		state: 'OPEN',
		author: 'dev',
		sourceBranch: 'feature/upload-fix',
		targetBranch: 'main',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		url: 'https://example.invalid/pr/42',
	},
];

export const MOCK_COMMITS: CommitSummary[] = [
	{ hash: 'a1b2c3d', message: 'Harden upload validation', author: 'dev', date: new Date().toISOString(), url: 'https://example.invalid/commit/a1' },
	{ hash: 'e4f5g6h', message: 'Add syndication metrics', author: 'dev', date: new Date().toISOString() },
];

export const MOCK_CICD_ANALYSIS: CicdAnalysis = {
	summary: 'Mock pipeline: build → test → deploy (read-only analysis).',
	filesConsidered: ['.github/workflows/ci.yml', 'package.json'],
	findings: ['Sample workflow runs on push to main', 'Uses Node 20 matrix'],
	riskHints: ['Ensure secrets use CI variables', 'Add manual approval before production deploy'],
};
