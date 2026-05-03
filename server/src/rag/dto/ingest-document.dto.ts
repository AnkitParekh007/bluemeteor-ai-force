import { IsOptional, IsString, MinLength } from 'class-validator';

export class IngestDocumentDto {
	@IsString()
	@MinLength(1)
	title!: string;

	@IsString()
	sourceType!: string;

	@IsOptional()
	@IsString()
	sourceUri?: string;

	@IsString()
	@MinLength(1)
	content!: string;
}
