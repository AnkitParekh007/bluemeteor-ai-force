import { IsOptional, IsString, MaxLength } from 'class-validator';

import type { FeedbackTriageCategory, FeedbackSeverity, FeedbackTriageStatus } from '../models/feedback-triage.model';

export class TriageFeedbackDto {
	@IsOptional()
	@IsString()
	category?: FeedbackTriageCategory;

	@IsOptional()
	@IsString()
	severity?: FeedbackSeverity;

	@IsOptional()
	@IsString()
	status?: FeedbackTriageStatus;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	summary?: string;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	rootCause?: string;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	recommendedAction?: string;

	@IsOptional()
	@IsString()
	assignedToUserId?: string;
}
