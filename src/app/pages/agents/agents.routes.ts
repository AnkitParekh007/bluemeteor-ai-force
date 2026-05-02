import type { Routes } from '@angular/router';

import { agentSlugGuard } from '../../core/guards/agent-route.guard';

/**
 * Single lazy-loaded workbench for any catalog agent (`MOCK_AGENTS` lookup by slug).
 */
export const agentFeatureRoutes: Routes = [
    {
        path: ':slug',
        canActivate: [agentSlugGuard],
        loadComponent: () =>
            import('./agent-workspace/agent-workspace.component').then(
                (m) => m.AgentWorkspaceComponent,
            ),
    },
];
