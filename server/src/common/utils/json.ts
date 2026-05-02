/** Safe JSON helpers for nullable DB columns. */

export function stringifyJson(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	try {
		return JSON.stringify(value);
	} catch {
		return null;
	}
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
	if (value === null || value === undefined || value === '') return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}
