import { Injectable } from '@nestjs/common';

const DEFAULT_MAX = 900;

@Injectable()
export class RagChunkingService {
	chunkText(content: string, maxChars = DEFAULT_MAX): string[] {
		const trimmed = content.trim();
		if (!trimmed) return [];
		const paras = trimmed.split(/\n\n+/);
		const chunks: string[] = [];
		let buf = '';
		for (const p of paras) {
			if (buf.length + p.length + 2 > maxChars) {
				if (buf) chunks.push(buf.trim());
				buf = p;
			} else {
				buf = buf ? `${buf}\n\n${p}` : p;
			}
		}
		if (buf) chunks.push(buf.trim());
		return chunks.filter((c) => c.length > 0);
	}
}
