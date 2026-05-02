/** Short composer chips (role-specific). Different from long-form templates in agent-task-templates. */

export const AGENT_QUICK_CHIPS: Readonly<Record<string, readonly string[]>> = {
	fronto: [
		'Inspect authenticated dashboard UI',
		'Capture UI screenshot',
		'Analyze responsive issues after login',
		'Create accessibility checklist from browser DOM',
		'Review this UI',
		'Generate Angular component',
	],
	backo: [
		'Design API contract',
		'Create DTOs',
		'Review service logic',
		'Generate database schema',
	],
	testo: [
		'Create login smoke test plan',
		'Start authenticated browser session',
		'Save browser login session',
		'Run login smoke test',
		'Run dashboard smoke test',
		'Generate Playwright spec for supplier upload',
		'Analyze latest test failure',
	],
	producto: [
		'Create user stories',
		'Define acceptance criteria',
		'Break feature into milestones',
		'Prepare sprint scope',
	],
	doco: ['Generate release notes', 'Write onboarding guide', 'Summarize feature behavior'],
	dato: ['Generate SQL query', 'Explain data issue', 'Create reporting checklist'],
	supporto: ['Summarize ticket', 'Draft customer reply', 'Identify root cause'],
	devopsy: ['Debug deployment', 'Review CI/CD pipeline', 'Prepare release checklist'],
};

export function quickChipsForSlug(slug: string): readonly string[] {
	return AGENT_QUICK_CHIPS[slug] ?? ['Draft next steps', 'List risks', 'Summarize for stakeholders'];
}
