import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import type { ImprovementCategory, ImprovementPriority } from '../models/agent-improvement-backlog.model';

export class CreateImprovementItemDto {
	@IsNotEmpty()
	@IsString()
	agentSlug!: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(500)
	title!: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(8000)
	description!: string;

	@IsNotEmpty()
	@IsString()
	sourceType!: 'feedback' | 'failed_run' | 'evaluation' | 'admin' | 'audit';

	@IsOptional()
	@IsString()
	sourceId?: string;

	@IsNotEmpty()
	@IsString()
	priority!: ImprovementPriority;

	@IsNotEmpty()
	@IsString()
	category!: ImprovementCategory;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	expectedImpact?: string;

	@IsOptional()
	proposedChange?: {
		promptTemplatePatch?: string;
		workflowSuggestion?: unknown;
		skillPackSuggestion?: unknown;
		newEvaluationCase?: unknown;
		notes?: string;
	};
}
