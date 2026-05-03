import { SetMetadata } from '@nestjs/common';

import { SESSION_ACCESS_KEY } from '../auth.constants';
import type { AgentAccessLevel } from '../models/auth-user.model';
import type { SessionAccessResourceKind } from '../services/session-access-resolver.service';

export interface SessionAccessMeta {
	readonly kind: SessionAccessResourceKind;
	readonly level: AgentAccessLevel;
	readonly param: string;
	readonly source?: 'params' | 'body' | 'query';
}

const meta = (
	kind: SessionAccessResourceKind,
	level: AgentAccessLevel,
	param: string,
	source: SessionAccessMeta['source'] = 'params',
): SessionAccessMeta => ({ kind, level, param, source });

/** Enforce agent access for a route param `sessionId` (default). */
export const RequireSessionAccess = (level: AgentAccessLevel, param = 'sessionId', source: SessionAccessMeta['source'] = 'params') =>
	SetMetadata(SESSION_ACCESS_KEY, meta('session', level, param, source));

/** Enforce agent access using an agent run id. */
export const RequireRunAccess = (level: AgentAccessLevel, param = 'runId', source: SessionAccessMeta['source'] = 'params') =>
	SetMetadata(SESSION_ACCESS_KEY, meta('run', level, param, source));

export const RequireBrowserSessionAccess = (level: AgentAccessLevel, param = 'browserSessionId') =>
	SetMetadata(SESSION_ACCESS_KEY, meta('browserSession', level, param, 'params'));

export const RequireTestRunAccess = (level: AgentAccessLevel, param = 'testRunId') =>
	SetMetadata(SESSION_ACCESS_KEY, meta('testRun', level, param, 'params'));

export const RequireArtifactAccess = (level: AgentAccessLevel, param = 'artifactId') =>
	SetMetadata(SESSION_ACCESS_KEY, meta('artifact', level, param, 'params'));

export const RequirePlaywrightSpecAccess = (level: AgentAccessLevel, param = 'specId') =>
	SetMetadata(SESSION_ACCESS_KEY, meta('playwrightSpec', level, param, 'params'));
