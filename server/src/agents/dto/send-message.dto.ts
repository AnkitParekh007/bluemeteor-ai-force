import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
	@IsOptional()
	@IsString()
	sessionId?: string;

	@IsString()
	agentSlug!: string;

	@IsIn(['ask', 'plan', 'act'])
	mode!: 'ask' | 'plan' | 'act';

	@IsString()
	message!: string;

	@IsOptional()
	@IsObject()
	context?: Record<string, unknown>;
}
