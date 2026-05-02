import { SetMetadata } from '@nestjs/common';

import type { AgentAccessLevel } from '../models/auth-user.model';
import { AGENT_ACCESS_KEY } from '../auth.constants';

/** Requires access to `agentSlug` from route/body/query at least at this level. */
export const RequireAgentAccess = (level: AgentAccessLevel) => SetMetadata(AGENT_ACCESS_KEY, level);
