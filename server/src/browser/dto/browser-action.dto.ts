import { IsIn, IsOptional, IsString } from 'class-validator';

const ACTION_TYPES = [
	'open_url',
	'click',
	'fill',
	'press',
	'wait_for_selector',
	'screenshot',
	'inspect_dom',
	'extract_text',
	'close',
] as const;

export class BrowserActionDto {
	@IsString()
	runId!: string;

	@IsString()
	@IsIn(ACTION_TYPES as unknown as string[])
	type!: (typeof ACTION_TYPES)[number];

	@IsOptional()
	@IsString()
	url?: string;

	@IsOptional()
	@IsString()
	selector?: string;

	@IsOptional()
	@IsString()
	value?: string;

	@IsOptional()
	@IsString()
	key?: string;
}
