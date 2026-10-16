export const CHUNK_TARGET = 360;
export const CHUNK_MAX = 460;
const TITLE_CHARS = 40;
/** 模型或切块策略变化时递增，旧索引随之失效。 */
export const INDEX_VERSION = "bge-small-zh-v1.5/q8/c1";

/** 按段落聚合成约 300–500 字的块；过长段落按句号等标点再切。 */
export function chunkBody(text: string): string[] {
  const pieces: string[] = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length <= CHUNK_MAX) { pieces.push(trimmed); continue; }
    let current = "";
    for (const sentence of trimmed.split(/(?<=[。！？!?；;.\n])/)) {
      if (current && current.length + sentence.length > CHUNK_MAX) { pieces.push(current); current = ""; }
      let rest = sentence;
      while (rest.length > CHUNK_MAX) { pieces.push(rest.slice(0, CHUNK_MAX)); rest = rest.slice(CHUNK_MAX); }
      current += rest;
    }
    if (current) pieces.push(current);
  }
  const chunks: string[] = [];
  let buffer = "";
  for (const piece of pieces) {
    if (buffer && buffer.length + piece.length + 1 > CHUNK_MAX) { chunks.push(buffer); buffer = ""; }
    buffer = buffer ? `${buffer}\n${piece}` : piece;
    if (buffer.length >= CHUNK_TARGET) { chunks.push(buffer); buffer = ""; }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

/** 送入模型的文本：标题拼在每块开头。 */
export function withTitle(title: string, chunk: string) {
  return `${title.trim().slice(0, TITLE_CHARS)}\n${chunk}`;
}

/** 内容哈希：长度 + 双路 32 位累加，足够识别改动。 */
export function hashText(text: string): string {
  let a = 0x811c9dc5, b = 5381;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    a = Math.imul(a ^ code, 16777619);
    b = (Math.imul(b, 33) + code) | 0;
  }
  return `${INDEX_VERSION}:${text.length}:${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

export function quantize(vector: Float32Array): Int8Array {
  const out = new Int8Array(vector.length);
  for (let i = 0; i < vector.length; i++) out[i] = Math.max(-127, Math.min(127, Math.round(vector[i] * 127)));
  return out;
}
