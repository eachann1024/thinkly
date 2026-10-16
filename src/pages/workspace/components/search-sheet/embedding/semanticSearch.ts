import type { Page } from "@/types";
import { embedQuery } from "./embeddingClient";
import { ensureIndexLoaded, getMemoryIndex, kickSemanticIndexing } from "./semanticIndex";

export interface SemanticHit { id: string; score: number; text: string }

const MIN_SCORE = 0.3;
const TOP_K = 8;

function search(query: Float32Array, candidates: Page[]): SemanticHit[] {
  const memory = getMemoryIndex();
  const hits: SemanticHit[] = [];
  for (const page of candidates) {
    const record = memory.get(page.id);
    if (!record) continue;
    let best = -1, bestText = "";
    for (const chunk of record.chunks) {
      let sum = 0;
      for (let i = 0; i < query.length; i++) sum += query[i] * chunk.vec[i];
      if (sum > best) { best = sum; bestText = chunk.text; }
    }
    const score = best / 127;
    if (bestText && score >= MIN_SCORE) hits.push({ id: page.id, score, text: bestText });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, TOP_K);
}

/** 向量检索；模型未就绪、索引未覆盖或超时都返回空数组，绝不抛错。 */
export async function semanticSearch(question: string, candidates: Page[], timeoutMs = 1500): Promise<SemanticHit[]> {
  kickSemanticIndexing();
  const run = async () => {
    await ensureIndexLoaded();
    if (!candidates.some(page => getMemoryIndex().get(page.id)?.chunks.length)) return [];
    return search(await embedQuery(question), candidates);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<SemanticHit[]>(resolve => { timer = setTimeout(() => resolve([]), timeoutMs); }),
    ]);
  } catch { return []; }
  finally { clearTimeout(timer); }
}
