export const IS_PUBLIC_KEY = 'bm_public_route';
/** OR semantics: user must have at least one listed permission (or system.admin). */
export const ANY_PERMISSIONS_KEY = 'bm_any_permissions';
export const PERMISSIONS_KEY = 'bm_required_permissions';
export const ROLES_KEY = 'bm_required_roles';
/** Minimum agent access level (view | use | act | admin). */
export const AGENT_ACCESS_KEY = 'bm_required_agent_access';
/** Resolve session/run/artifact → agent and enforce access. */
export const SESSION_ACCESS_KEY = 'bm_session_access';
