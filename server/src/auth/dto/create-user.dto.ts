import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
	@IsEmail()
	email!: string;

	@IsString()
	@MinLength(8)
	password!: string;

	@IsString()
	@MinLength(1)
	name!: string;

	@IsOptional()
	@IsString()
	department?: string;

	@IsOptional()
	@IsString()
	jobTitle?: string;

	@IsOptional()
	@IsString()
	roleKey?: string;
}
