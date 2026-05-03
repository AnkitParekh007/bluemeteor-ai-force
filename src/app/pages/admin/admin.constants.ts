export const ADMIN_PRIORITY_AGENT_SLUGS = [
	'fronto',
	'backo',
	'testo',
	'producto',
	'doco',
	'dato',
	'supporto',
	'devopsy',
] as const;

export type AdminPriorityAgentSlug = (typeof ADMIN_PRIORITY_AGENT_SLUGS)[number];
