import { Injectable } from '@nestjs/common';

import type {
	FeedbackTriageCategory,
	FeedbackSeverity,
} from '../models/feedback-triage.model';

interface ClassificationInput {
	readonly rating: number;
	readonly whatFailed: string;
	readonly whatWorked: string;
	readonly taskType: string;
}

interface ClassificationResult {
	readonly category: FeedbackTriageCategory;
	readonly severity: FeedbackSeverity;
	readonly summary: string;
	readonly rootCause: string;
	readonly recommendedAction: string;
}

@Injectable()
export class FeedbackClassifierService {
	classify(input: ClassificationInput): ClassificationResult {
		const category = this.detectCategory(input.whatFailed, input.taskType);
		const severity = this.deriveSeverity(input.rating, category);
		const rootCause = this.deriveRootCause(category, input.whatFailed);
		const recommendedAction = this.deriveRecommendedAction(category);
		const summary = this.buildSummary(input, category, severity);

		return { category, severity, summary, rootCause, recommendedAction };
	}

	private detectCategory(whatFailed: string, taskType: string): FeedbackTriageCategory {
		const text = `${whatFailed} ${taskType}`.toLowerCase();

		if (/hallucin|made.?up|invented|fabricat|not.?real|fake/.test(text)) return 'hallucination';
		if (/playwright|spec|test.?fail|browser.?fail|screenshot|page.?crash/.test(text)) return 'browser_failed';
		if (/permission|access.?deni|403|401|unauthori|forbidden/.test(text)) return 'permission_issue';
		if (/artifact|file.?(missing|not.?created|not.?generated)|code.?(missing|not.?generated)/.test(text)) return 'missing_artifact';
		if (/tool.?(fail|error|crash|not.?work)|connector.?fail|mcp.?fail/.test(text)) return 'tool_failed';
		if (/wrong.?tool|incorrect.?tool|used.?the.?wrong/.test(text)) return 'wrong_tool_used';
		if (/slow|took.?long|timeout|too.?much.?time/.test(text)) return 'slow_response';
		if (/wrong|incorrect|not.?true|inaccurat|mislead/.test(text)) return 'wrong_answer';
		if (/missing|did.?not.?include|incomplete|left.?out|omit|partial/.test(text)) return 'incomplete_answer';
		if (/context|did.?not.?know|needed.?info|need.?more.?info|lack.?context/.test(text)) return 'missing_context';
		if (/did.?not.?understand|ignored.?prompt|misunderstood|poor.?compre/.test(text)) return 'poor_prompt_understanding';
		if (/format|layout|structure.?wrong|badly.?formatted/.test(text)) return 'bad_format';
		if (/ui|button|display|render|page.?broken|visual/.test(text)) return 'ui_issue';

		return 'other';
	}

	private deriveSeverity(rating: number, category: FeedbackTriageCategory): FeedbackSeverity {
		if (rating === 1) return 'critical';
		if (rating === 2) {
			if (category === 'hallucination' || category === 'permission_issue') return 'critical';
			return 'high';
		}
		if (rating === 3) {
			if (['wrong_answer', 'missing_artifact', 'tool_failed', 'browser_failed'].includes(category)) {
				return 'high';
			}
			return 'medium';
		}
		return 'low';
	}

	private deriveRootCause(category: FeedbackTriageCategory, whatFailed: string): string {
		const causeMap: Record<FeedbackTriageCategory, string> = {
			wrong_answer: 'Prompt may lack grounding instructions or source-citation requirements.',
			incomplete_answer: 'Response style prompt or workflow does not enforce completeness.',
			bad_format: 'Output format instructions in prompt are insufficient.',
			missing_artifact: 'Workflow template does not include required artifact generation steps.',
			wrong_tool_used: 'Tool planning prompt or skill pack tool selection needs refinement.',
			tool_failed: 'Tool runtime error or missing error-handling in tool pipeline.',
			browser_failed: 'Browser worker or Playwright workflow has a gap for this task type.',
			slow_response: 'Provider latency or workflow step count may be excessive.',
			permission_issue: 'RBAC or connector permission gap for this user role.',
			hallucination: 'Prompt lacks explicit instruction to refuse unknown context.',
			poor_prompt_understanding: 'Intent detection or clarification workflow needs improvement.',
			missing_context: 'RAG/connector context is missing for this task domain.',
			ui_issue: 'Frontend rendering or workspace component issue.',
			other: `Unclassified issue: "${whatFailed.slice(0, 100)}"`,
		};
		return causeMap[category];
	}

	private deriveRecommendedAction(category: FeedbackTriageCategory): string {
		const actionMap: Record<FeedbackTriageCategory, string> = {
			wrong_answer: 'Add evaluation case; improve prompt with grounding and citation rules.',
			incomplete_answer: 'Update response-style prompt; add completeness check to workflow.',
			bad_format: 'Refine output format instructions in agent prompt template.',
			missing_artifact: 'Update workflow template outputArtifactTypes; add artifact generation step.',
			wrong_tool_used: 'Review tool planning prompt and skill pack tool configuration.',
			tool_failed: 'Investigate tool health; add error handling; create runbook item.',
			browser_failed: 'Review Playwright workflow template; add fallback steps.',
			slow_response: 'Profile provider call chain; consider reducing workflow steps.',
			permission_issue: 'Review RBAC policy; check connector permission requirements.',
			hallucination: 'Add prompt rule: refuse to invent unavailable context; add evaluation case.',
			poor_prompt_understanding: 'Add clarification workflow; improve intent detection rules.',
			missing_context: 'Add connector or RAG ingestion step; improve context builder.',
			ui_issue: 'File frontend bug; review workspace component rendering.',
			other: 'Review manually; categorise more specifically if possible.',
		};
		return actionMap[category];
	}

	private buildSummary(
		input: ClassificationInput,
		category: FeedbackTriageCategory,
		severity: FeedbackSeverity,
	): string {
		const snippet = input.whatFailed.length > 120
			? `${input.whatFailed.slice(0, 120)}…`
			: input.whatFailed;
		return `[${severity.toUpperCase()}] ${category.replace(/_/g, ' ')} — "${snippet}"`;
	}
}
