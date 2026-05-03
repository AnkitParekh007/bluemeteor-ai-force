import type { PilotRole } from '../models/pilot.models';

/** Quick sample prompts indexed by primary pilot role. */
export const PILOT_SAMPLE_PROMPTS_BY_ROLE: Readonly<Record<PilotRole, readonly string[]>> = {
	frontend_engineer: [
		'Review this UI and suggest improvements.',
		'Generate an Angular component for a supplier upload card.',
	],
	backend_engineer: [
		'Design the API contract for supplier upload jobs.',
		'Create DTOs for agent sessions and runs.',
	],
	qa_engineer: [
		'Create regression tests for the supplier upload failed ticket.',
		'Run login smoke test.',
	],
	product_manager: [
		'Create user stories from recent supplier upload issues.',
		'Define acceptance criteria for browser testing.',
	],
	documentation_owner: [
		'Create onboarding docs for supplier upload workflow.',
		'Write release notes for the agent workspace.',
	],
	data_analyst: [
		'Generate SQL to report failed supplier uploads by supplier.',
		'Define dashboard metrics for agent usage.',
	],
	support_agent: [
		'Draft a customer reply for supplier upload failure.',
		'Summarize this customer issue.',
	],
	devops_engineer: [
		'Review CI/CD pipeline risks and create release checklist.',
		'Prepare rollback plan.',
	],
	team_lead: [
		'Summarize pilot risks for Fronto and Testo this week.',
		'List three readiness checks we should own before expanding pilot.',
	],
	admin: [
		'Summarize what admins should verify daily during pilot.',
		'Outline escalation steps if SSE errors spike.',
	],
};

export function pilotSamplePromptsForAgentSlug(slug: string): readonly string[] {
	const map: Record<string, readonly string[]> = {
		fronto: PILOT_SAMPLE_PROMPTS_BY_ROLE.frontend_engineer,
		backo: PILOT_SAMPLE_PROMPTS_BY_ROLE.backend_engineer,
		testo: PILOT_SAMPLE_PROMPTS_BY_ROLE.qa_engineer,
		producto: PILOT_SAMPLE_PROMPTS_BY_ROLE.product_manager,
		doco: PILOT_SAMPLE_PROMPTS_BY_ROLE.documentation_owner,
		dato: PILOT_SAMPLE_PROMPTS_BY_ROLE.data_analyst,
		supporto: PILOT_SAMPLE_PROMPTS_BY_ROLE.support_agent,
		devopsy: PILOT_SAMPLE_PROMPTS_BY_ROLE.devops_engineer,
	};
	return map[slug] ?? PILOT_SAMPLE_PROMPTS_BY_ROLE.qa_engineer;
}
