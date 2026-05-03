import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import type { AgentSessionStoreSnapshot } from './agent-session.store';

const STORAGE_KEY_PREFIX = 'bm-agent-workspace-v1';

@Injectable({ providedIn: 'root' })
export class AgentSessionPersistenceService {
	private enabled(): boolean {
		return environment.enableMockAgents && environment.enableSessionPersistence;
	}

	loadWorkspaceState(agentSlug: string): AgentSessionStoreSnapshot | null {
		if (!this.enabled() || typeof localStorage === 'undefined') return null;
		try {
			const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${agentSlug}`);
			if (!raw) return null;
			return JSON.parse(raw) as AgentSessionStoreSnapshot;
		} catch {
			return null;
		}
	}

	saveWorkspaceState(agentSlug: string, state: AgentSessionStoreSnapshot): void {
		if (!this.enabled() || typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(`${STORAGE_KEY_PREFIX}:${agentSlug}`, JSON.stringify(state));
		} catch {
			/* quota / privacy mode */
		}
	}

	clearWorkspaceState(agentSlug: string): void {
		if (typeof localStorage === 'undefined') return;
		localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${agentSlug}`);
	}
}
