import { IsIn } from 'class-validator';

export class CreateSessionDto {
	@IsIn(['ask', 'plan', 'act'])
	mode!: 'ask' | 'plan' | 'act';
}
