import { Module } from '@nestjs/common';

import { AgentIntelligenceModule } from '../agent-intelligence/agent-intelligence.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PilotImprovementController } from './controllers/pilot-improvement.controller';
import { FeedbackTriageRepository } from './repositories/feedback-triage.repository';
import { AgentImprovementBacklogRepository } from './repositories/agent-improvement-backlog.repository';
import { AgentImprovementRunRepository } from './repositories/agent-improvement-run.repository';
import { FeedbackClassifierService } from './services/feedback-classifier.service';
import { FeedbackTriageService } from './services/feedback-triage.service';
import { AgentImprovementBacklogService } from './services/agent-improvement-backlog.service';
import { AgentImprovementRecommendationService } from './services/agent-improvement-recommendation.service';
import { AgentRegressionAnalysisService } from './services/agent-regression-analysis.service';
import { EvaluationCaseGeneratorService } from './services/evaluation-case-generator.service';
import { AgentImprovementReportService } from './services/agent-improvement-report.service';

@Module({
	imports: [AuthModule, DatabaseModule, AgentIntelligenceModule],
	controllers: [PilotImprovementController],
	providers: [
		FeedbackTriageRepository,
		AgentImprovementBacklogRepository,
		AgentImprovementRunRepository,
		FeedbackClassifierService,
		FeedbackTriageService,
		AgentImprovementBacklogService,
		AgentImprovementRecommendationService,
		AgentRegressionAnalysisService,
		EvaluationCaseGeneratorService,
		AgentImprovementReportService,
	],
	exports: [
		AgentImprovementBacklogService,
		FeedbackTriageService,
		AgentRegressionAnalysisService,
	],
})
export class PilotImprovementModule {}
