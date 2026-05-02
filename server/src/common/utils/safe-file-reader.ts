import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Extensions permitted for readTextFileSafe / listFilesSafe text reads. */
export const SAFE_TEXT_EXTENSIONS = new Set([
	'.ts',
	'.html',
	'.scss',
	'.css',
	'.json',
	'.md',
	'.yml',
	'.yaml',
	'.txt',
]);

const BLOCKED_PATH_SEGMENTS = new Set([
	'node_modules',
	'dist',
	'.git',
	'.svn',
	'.hg',
]);

function isBlockedRelative(rel: string): boolean {
	const norm = rel.replace(/\\/g, '/').toLowerCase();
	const segments = norm.split('/').filter(Boolean);
	for (const seg of segments) {
		if (BLOCKED_PATH_SEGMENTS.has(seg)) return true;
	}
	if (norm.endsWith('.env') || norm.includes('/.env') || norm.startsWith('.env')) return true;
	if (norm.endsWith('.pem') || norm.endsWith('.key')) return true;
	if (norm.includes('id_rsa') || norm.includes('id_ed25519')) return true;
	return false;
}

/**
 * Resolve `requestedPath` under `root` and ensure it stays within root and under one of `allowedPaths` prefixes.
 * `allowedPaths` entries are relative to root (e.g. "src", "server", "README.md").
 */
export function resolveSafePath(root: string, requestedPath: string, allowedPaths: string[]): string {
	const rootAbs = path.resolve(root);
	if (!allowedPaths.length) {
		throw new Error('safe_path_no_allowed_paths');
	}
	let normalized = path.normalize(requestedPath).replace(/^([/\\])+/, '');
	if (normalized.startsWith('..')) {
		throw new Error('path_traversal');
	}
	const candidate = path.resolve(rootAbs, normalized);
	const rootResolved = path.resolve(rootAbs);
	if (!candidate.startsWith(rootResolved)) {
		throw new Error('path_outside_root');
	}
	const rel = path.relative(rootResolved, candidate).replace(/\\/g, '/');
	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		throw new Error('path_invalid');
	}
	if (isBlockedRelative(rel)) {
		throw new Error('path_blocked');
	}
	const allowed = allowedPaths.some((ap) => {
		const p = ap.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
		return rel === p || rel.startsWith(`${p}/`);
	});
	if (!allowed) {
		throw new Error('path_not_allowed');
	}
	return candidate;
}

export function isPathAllowed(resolvedPath: string, allowedRoots: string[]): boolean {
	const abs = path.resolve(resolvedPath);
	return allowedRoots.some((r) => abs.startsWith(path.resolve(r)));
}

export async function readTextFileSafe(filePath: string, maxBytes: number): Promise<string> {
	const st = await fs.stat(filePath);
	if (!st.isFile()) {
		throw new Error('not_a_file');
	}
	if (st.size > maxBytes) {
		throw new Error(`file_too_large:${st.size}`);
	}
	const ext = path.extname(filePath).toLowerCase();
	if (!SAFE_TEXT_EXTENSIONS.has(ext)) {
		throw new Error(`extension_not_allowed:${ext}`);
	}
	const rel = filePath.toLowerCase();
	if (rel.endsWith('.env') || rel.includes(`${path.sep}.env`)) {
		throw new Error('env_blocked');
	}
	return fs.readFile(filePath, 'utf8');
}

export interface FileSummary {
	readonly path: string;
	readonly name: string;
	readonly extension: string;
	readonly size: number;
	readonly modifiedAt?: string;
}

export interface ListFilesSafeOptions {
	readonly maxDepth: number;
	readonly maxFiles: number;
	readonly maxFileBytes: number;
}

/**
 * Depth-first listing under allowed prefixes; only includes safe text extensions and skips blocked paths.
 */
export async function listFilesSafe(
	root: string,
	allowedPaths: string[],
	options: ListFilesSafeOptions,
): Promise<FileSummary[]> {
	const out: FileSummary[] = [];
	const seen = new Set<string>();
	async function walk(prefixRel: string, depth: number): Promise<void> {
		if (out.length >= options.maxFiles || depth > options.maxDepth) return;
		let abs: string;
		try {
			abs = resolveSafePath(root, prefixRel, allowedPaths);
		} catch {
			return;
		}
		let entries: Dirent[];
		try {
			entries = await fs.readdir(abs, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of entries) {
			if (out.length >= options.maxFiles) break;
			const name = ent.name;
			if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
			const childRel = prefixRel ? `${prefixRel.replace(/\/+$/, '')}/${name}` : name;
			if (isBlockedRelative(childRel)) continue;
			if (ent.isDirectory()) {
				await walk(childRel, depth + 1);
				continue;
			}
			if (!ent.isFile()) continue;
			const ext = path.extname(name).toLowerCase();
			if (!SAFE_TEXT_EXTENSIONS.has(ext)) continue;
			try {
				const full = resolveSafePath(root, childRel, allowedPaths);
				const st = await fs.stat(full);
				if (st.size > options.maxFileBytes) continue;
				const key = full;
				if (seen.has(key)) continue;
				seen.add(key);
				out.push({
					path: childRel.replace(/\\/g, '/'),
					name,
					extension: ext,
					size: st.size,
					modifiedAt: st.mtime.toISOString(),
				});
			} catch {
				/* skip */
			}
		}
	}
	for (const ap of allowedPaths) {
		const rel = ap.replace(/\\/g, '/').replace(/^\/+/, '');
		try {
			const abs = resolveSafePath(root, rel, allowedPaths);
			const st = await fs.stat(abs);
			if (st.isFile()) {
				const ext = path.extname(rel).toLowerCase();
				if (SAFE_TEXT_EXTENSIONS.has(ext) && st.size <= options.maxFileBytes && out.length < options.maxFiles) {
					out.push({
						path: rel,
						name: path.basename(rel),
						extension: ext,
						size: st.size,
						modifiedAt: st.mtime.toISOString(),
					});
				}
				continue;
			}
		} catch {
			continue;
		}
		await walk(rel, 0);
		if (out.length >= options.maxFiles) break;
	}
	return out.sort((a, b) => a.path.localeCompare(b.path));
}
