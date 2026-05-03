export interface SpecSanitizerResult {
	readonly valid: boolean;
	readonly reasons: string[];
}

const BLOCK_PATTERNS: RegExp[] = [
	/child_process/i,
	/\bfs\./i,
	/process\.env/i,
	/\brequire\s*\(/i,
	/\bimport\s*\(/i,
	/\beval\b/i,
	/\bFunction\s*\(/i,
	/\bpage\.evaluate\s*\(/i,
	/\bfetch\s*\(/i,
	/\baxios\b/i,
	/\bexec\s*\(/i,
	/\bspawn\s*\(/i,
	/\bwriteFile\b/i,
	/\bunlink\b/i,
];

export function validateGeneratedSpec(content: string): SpecSanitizerResult {
	const reasons: string[] = [];
	const trimmed = content.trim();
	if (!trimmed) {
		reasons.push('Empty spec');
		return { valid: false, reasons };
	}
	if (trimmed.length > 120_000) reasons.push('Spec exceeds size cap');
	for (const re of BLOCK_PATTERNS) {
		if (re.test(trimmed)) reasons.push(`Blocked pattern: ${re.source}`);
	}
	return { valid: reasons.length === 0, reasons };
}
