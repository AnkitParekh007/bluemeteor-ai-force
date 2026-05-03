import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AgentSkillPack } from '../../../core/models/agent-intelligence.models';

@Component({
	selector: 'app-skill-pack-list',
	standalone: true,
	templateUrl: './skill-pack-list.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillPackListComponent {
	readonly packs = input.required<AgentSkillPack[]>();
	readonly agentSlug = input.required<string>();
}
