const BLOCKED = /\.env($|[./\\])/i;
const BLOCKED_NAMES = new Set([
	'.env',
	'.env.local',
	'.env.production',
	'.git',
	'node_modules',
	'dist',
	'id_rsa',
	'id_dsa',
	'id_ecdsa',
	'id_ed25519',
]);

export function isBlockedRepoPath(p: string): boolean {
	const norm = p.replace(/\\/g, '/').replace(/^\/+/, '');
	if (!norm) return false;
	const lower = norm.toLowerCase();
	if (BLOCKED.test(lower)) return true;
	const seg = lower.split('/');
	for (const s of seg) {
		if (BLOCKED_NAMES.has(s)) return true;
		if (s.endsWith('.pem') || s.endsWith('.ppk') || s.endsWith('.key')) return true;
	}
	return false;
}
