import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
	@IsOptional()
	@IsString()
	@MinLength(1)
	name?: string;

	@IsOptional()
	@IsString()
	department?: string;

	@IsOptional()
	@IsString()
	jobTitle?: string;

	@IsOptional()
	@IsString()
	status?: string;
}
