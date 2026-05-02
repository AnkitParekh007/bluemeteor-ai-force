import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AgentToolCall } from '../../../../core/models/agent-runtime.models';

@Component({
	selector: 'app-agent-internal-tools-panel',
	standalone: true,
	templateUrl: './agent-internal-tools-panel.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentInternalToolsPanelComponent {
	readonly toolCalls = input<readonly AgentToolCall[]>([]);

	protected sourceFor(name: string): string {
		if (name.startsWith('connector_')) return 'connector';
		if (name.startsWith('repository_')) return 'repository';
		if (name.startsWith('docs_')) return 'docs';
		if (name.startsWith('tickets_')) return 'tickets';
		if (name.startsWith('api_catalog_')) return 'api catalog';
		if (name.startsWith('db_schema_')) return 'db schema';
		if (name.startsWith('cicd_')) return 'cicd';
		if (name.startsWith('mcp_')) return 'mcp';
		return 'other';
	}

	protected connectorBadge(name: string, o: Record<string, unknown> | undefined): string | null {
		if (!name.startsWith('connector_')) return null;
		const m = o?.['metadata'];
		const src =
			m &&
			typeof m === 'object' &&
			typeof (m as Record<string, unknown>)['connectorSource'] === 'string'
				? String((m as Record<string, unknown>)['connectorSource'])
				: '';
		if (src) return src;
		if (name.includes('jira')) return 'Jira';
		if (name.includes('confluence')) return 'Confluence';
		if (name.includes('support')) return 'Support';
		if (name.includes('repo')) return 'Repo';
		if (name.includes('cicd')) return 'CI/CD';
		return 'Connector';
	}

	protected mockFallback(o: Record<string, unknown> | undefined): boolean {
		const m = o?.['metadata'];
		return !!(
			m &&
			typeof m === 'object' &&
			(m as Record<string, unknown>)['mockFallback'] === true
		);
	}

	protected summaryFromOutput(o: Record<string, unknown> | undefined): string {
		if (!o) return '';
		const s = o['summary'];
		return typeof s === 'string' ? s : '';
	}

	protected isReadOnlyBadge(o: Record<string, unknown>): boolean {
		const m = o['metadata'];
		if (m && typeof m === 'object' && (m as Record<string, unknown>)['source'] === 'mcp') {
			return (m as Record<string, unknown>)['blocked'] !== true;
		}
		return false;
	}

	protected isMcpBlocked(o: Record<string, unknown> | undefined): boolean {
		if (!o) return false;
		const m = o['metadata'];
		return !!(m && typeof m === 'object' && (m as Record<string, unknown>)['blocked'] === true);
	}
}
