/** Strip common markdown markers for plain-text UI display. */
export function stripSimpleMarkdown(text: string): string {
	return text
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/^###\s+/gm, '');
}
