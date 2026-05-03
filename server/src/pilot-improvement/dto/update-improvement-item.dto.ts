import { IsOptional, IsString, MaxLength } from 'class-validator';

import type { ImprovementCategory, ImprovementPriority, ImprovementStatus } from '../models/agent-improvement-backlog.model';

export class UpdateImprovementItemDto {
	@IsOptional()
	@IsString()
	@MaxLength(500)
	title?: string;

	@IsOptional()
	@IsString()
	@MaxLength(8000)
	description?: string;

	@IsOptional()
	@IsString()
	priority?: ImprovementPriority;

	@IsOptional()
	@IsString()
	status?: ImprovementStatus;

	@IsOptional()
	@IsString()
	category?: ImprovementCategory;

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
