import { IsIn, IsString } from 'class-validator';

export class StreamQueryDto {
	@IsString()
	agentSlug!: string;

	@IsIn(['ask', 'plan', 'act'])
	mode!: 'ask' | 'plan' | 'act';

	@IsString()
	message!: string;
}
