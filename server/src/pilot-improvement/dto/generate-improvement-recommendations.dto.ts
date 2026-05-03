import { IsOptional, IsString } from 'class-validator';

export class GenerateImprovementRecommendationsDto {
	@IsOptional()
	@IsString()
	agentSlug?: string;
}
