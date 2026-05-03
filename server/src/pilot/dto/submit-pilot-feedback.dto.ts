import { Type } from 'class-transformer';
import {
	IsBoolean,
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	MinLength,
} from 'class-validator';

const PILOT_ROLES = [
	'frontend_engineer',
	'backend_engineer',
	'qa_engineer',
	'product_manager',
	'documentation_owner',
	'data_analyst',
	'support_agent',
	'devops_engineer',
	'team_lead',
	'admin',
] as const;

export class SubmitPilotFeedbackDto {
	@IsString()
	@IsIn([...PILOT_ROLES])
	userRole!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(64)
	agentSlug!: string;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(5)
	rating!: number;

	@IsString()
	@MinLength(1)
	@MaxLength(200)
	taskType!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(8000)
	whatWorked!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(8000)
	whatFailed!: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(10080)
	timeSavedMinutes?: number;

	@IsBoolean()
	wouldUseAgain!: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(8000)
	notes?: string;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	sessionId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	runId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	traceId?: string;
}
