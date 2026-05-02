import { IsIn } from 'class-validator';

export class SubmitApprovalDto {
	@IsIn(['approved', 'rejected'])
	decision!: 'approved' | 'rejected';
}
