/**
 * Agent portraits live as `src/assets/images/{slug}.png` (slug matches `mock-agents.ts`).
 *
 * - If legacy `ChatGPT*.png` files exist, renames them to `{slug}.png` (roster order × sorted legacy names).
 * - Reads PNG IHDR + file size and writes `src/app/core/data/agent-card-images.ts`.
 *
 * Run: `node scripts/generate-agent-card-images.mjs` or `npm run generate:agent-card-images`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const imagesDir = path.join(root, 'src', 'assets', 'images');
const mockAgentsPath = path.join(root, 'src', 'app', 'core', 'data', 'mock-agents.ts');
const outPath = path.join(root, 'src', 'app', 'core', 'data', 'agent-card-images.ts');

const SKIP_FILES = new Set(['agents-banner.png', 'agents-login-banner.png']);

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readIHDR(buf) {
	if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) {
		throw new Error('Not a PNG');
	}
	let o = 8;
	const len = buf.readUInt32BE(o);
	o += 4;
	const type = buf.subarray(o, o + 4).toString('latin1');
	o += 4;
	if (type !== 'IHDR' || len !== 13) {
		throw new Error('Missing IHDR');
	}
	const width = buf.readUInt32BE(o);
	const height = buf.readUInt32BE(o + 4);
	return { width, height };
}

function extractSlugs(ts) {
	const re = /agent\(\s*[\r\n\s]*'([^']+)'/g;
	const slugs = [];
	let m;
	while ((m = re.exec(ts)) !== null) {
		slugs.push(m[1]);
	}
	return slugs;
}

function migrateLegacyChatgptPortraits(slugs) {
	const legacy = fs
		.readdirSync(imagesDir)
		.filter((f) => f.endsWith('.png') && f.startsWith('ChatGPT'))
		.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

	if (legacy.length === 0) {
		return;
	}

	const n = Math.min(slugs.length, legacy.length);
	// Phase 1: move to unique temps (avoid clobber if slug.png already exists)
	for (let i = 0; i < n; i++) {
		const from = path.join(imagesDir, legacy[i]);
		const tmp = path.join(imagesDir, `__agent-portrait-tmp-${i}.png`);
		fs.renameSync(from, tmp);
	}
	// Phase 2: temps → {slug}.png
	for (let i = 0; i < n; i++) {
		const tmp = path.join(imagesDir, `__agent-portrait-tmp-${i}.png`);
		const slug = slugs[i];
		const to = path.join(imagesDir, `${slug}.png`);
		fs.renameSync(tmp, to);
		console.log(`Renamed legacy portrait → ${slug}.png`);
	}

	if (legacy.length !== n) {
		console.warn(
			`Legacy rename: ${legacy.length} ChatGPT files, used first ${n} with roster order; leftover legacy files were not renamed.`,
		);
	}
}

const mockSrc = fs.readFileSync(mockAgentsPath, 'utf8');
const slugs = extractSlugs(mockSrc);

migrateLegacyChatgptPortraits(slugs);

const entries = [];
for (const slug of slugs) {
	const fileName = `${slug}.png`;
	if (SKIP_FILES.has(fileName)) {
		continue;
	}
	const abs = path.join(imagesDir, fileName);
	if (!fs.existsSync(abs)) {
		continue;
	}
	const buf = fs.readFileSync(abs);
	const { width, height } = readIHDR(buf);
	const src = `/assets/images/${encodeURIComponent(fileName)}`;
	entries.push({ slug, fileName, width, height, byteLength: buf.length, src });
}

const lines = [
	'/**',
	' * Agent card portrait assets: `src/assets/images/{slug}.png`.',
	' * Dimensions and size are read from each PNG (IHDR + file length).',
	' *',
	' * Regenerate: `node scripts/generate-agent-card-images.mjs`',
	' */',
	'',
	'export interface AgentCardImageMeta {',
	'	readonly src: string;',
	'	readonly width: number;',
	'	readonly height: number;',
	'	readonly byteLength: number;',
	'	readonly fileName: string;',
	'}',
	'',
	'export const AGENT_CARD_IMAGE_MAP: Readonly<Partial<Record<string, AgentCardImageMeta>>> = {',
];

for (const e of entries) {
	lines.push(
		`\t'${e.slug}': { src: '${e.src}', width: ${e.width}, height: ${e.height}, byteLength: ${e.byteLength}, fileName: ${JSON.stringify(e.fileName)} },`,
	);
}
lines.push('};');
lines.push('');
lines.push(
	'export function getAgentCardImage(slug: string): AgentCardImageMeta | undefined {',
	'\treturn AGENT_CARD_IMAGE_MAP[slug];',
	'}',
	'',
);

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${entries.length} entries to ${path.relative(root, outPath)}`);
const missing = slugs.length - entries.length;
if (missing > 0) {
	console.warn(`Note: ${entries.length} portraits on disk vs ${slugs.length} agents (${missing} without images).`);
}
