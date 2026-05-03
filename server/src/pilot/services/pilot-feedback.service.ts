import { Injectable } from '@nestjs/common';

import type { AuthUser } from '../../auth/models/auth-user.model';
import { SubmitPilotFeedbackDto } from '../dto/submit-pilot-feedback.dto';
import { PilotFeedbackRepository, type PilotFeedbackListFilters } from '../repositories/pilot-feedback.repository';

@Injectable()
export class PilotFeedbackService {
	constructor(private readonly repo: PilotFeedbackRepository) {}

	async submit(user: AuthUser | undefined, dto: SubmitPilotFeedbackDto): Promise<{ id: string }> {
		return this.repo.create({
			userId: user?.id ?? null,
			userEmail: user?.email ?? null,
			userRole: dto.userRole,
			agentSlug: dto.agentSlug,
			rating: dto.rating,
			taskType: dto.taskType,
			whatWorked: dto.whatWorked,
			whatFailed: dto.whatFailed,
			timeSavedMinutes: dto.timeSavedMinutes ?? null,
			wouldUseAgain: dto.wouldUseAgain,
			notes: dto.notes ?? null,
			sessionId: dto.sessionId ?? null,
			runId: dto.runId ?? null,
			traceId: dto.traceId ?? null,
		});
	}

	list(take: number, filters?: PilotFeedbackListFilters) {
		return this.repo.list(take, filters);
	}
}
