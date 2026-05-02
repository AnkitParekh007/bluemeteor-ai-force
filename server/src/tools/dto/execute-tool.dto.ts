import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class ExecuteToolDto {
	@IsString()
	runId!: string;

	@IsString()
	sessionId!: string;

	@IsString()
	agentSlug!: string;

	@IsIn(['ask', 'plan', 'act'])
	mode!: 'ask' | 'plan' | 'act';

	@IsString()
	toolId!: string;

	@IsOptional()
	@IsObject()
	input?: Record<string, unknown>;
}
