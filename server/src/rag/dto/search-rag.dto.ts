import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SearchRagDto {
	@IsString()
	@MinLength(1)
	query!: string;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(50)
	limit?: number;
}
