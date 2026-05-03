import type { AuthUser } from '../models/auth.models';
import type { PilotRole } from '../models/pilot.models';

/** Best-effort mapping from profile text to a pilot role for form defaults. */
export function inferPilotRoleFromUser(user: AuthUser | null | undefined): PilotRole {
	if (!user) return 'qa_engineer';
	const roles = user.roles.map((r) => r.toLowerCase());
	if (roles.some((r) => r.includes('admin'))) return 'admin';
	const blob = `${user.jobTitle ?? ''} ${user.department ?? ''}`.toLowerCase();
	if (blob.includes('frontend') || blob.includes('angular') || blob.includes('ui')) return 'frontend_engineer';
	if (blob.includes('backend') || blob.includes('api') || blob.includes('nest')) return 'backend_engineer';
	if (blob.includes('qa') || blob.includes('test')) return 'qa_engineer';
	if (blob.includes('product') || blob.includes('pm')) return 'product_manager';
	if (blob.includes('doc') || blob.includes('technical writer')) return 'documentation_owner';
	if (blob.includes('data') || blob.includes('analyst')) return 'data_analyst';
	if (blob.includes('support')) return 'support_agent';
	if (blob.includes('devops') || blob.includes('sre') || blob.includes('release')) return 'devops_engineer';
	if (blob.includes('lead') || blob.includes('manager')) return 'team_lead';
	return 'qa_engineer';
}
