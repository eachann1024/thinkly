import { getPageTitle } from "@/components/editor/utils/page-title";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";
import { getCachedText } from "../../command/searchBodyCache";
import { isCommandSearchablePage, shouldIncludePageInCommandScope } from "../../command/searchPageFilter";
import { armActivity, idleMs, shouldPause, sleep, sleepFactor, waitUntilRunnable } from "./activity";
import { chunkBody, hashText, quantize, withTitle } from "./chunker";
import { embedTexts } from "./embeddingClient";
import { deleteIndexes, loadAllIndexes, putIndex, type PageIndex } from "./semanticStore";

const BATCH_CHUNKS = 4;
const EDIT_DEBOUNCE_MS = 10_000;
const IDLE_START_MS = 30_000;
const TICK_MS = 10_000;

const memory = new Map<string, PageIndex>();
let loading: Promise<void> | null = null;
let started = false;
let running = false;
let ticking = false;

export function ensureIndexLoaded() {
  loading ??= loadAllIndexes().then(records => { for (const record of records) memory.set(record.id, record); });
  return loading;
}

export const getMemoryIndex = () => memory;

function allCandidates(): Page[] {
  const notebooks = useNotebooks.getState().notebooks;
  return Object.values(usePages.getState().pages)
    .filter(page => isCommandSearchablePage(page, notebooks) && shouldIncludePageInCommandScope(page, notebooks, true, null));
}

async function indexPage(page: Page) {
  const title = getPageTitle(page);
  const text = getCachedText(page);
  // 正文尚未加载的页先不记账，等内容就绪后的下一轮再算，避免被记成空索引后不再更新。
  if (!text.trim()) return;
  const hash = hashText(`${title}\n${text}`);
  const existing = memory.get(page.id);
  if (existing?.hash === hash) {
    const record = { ...existing, updatedAt: page.updatedAt };
    memory.set(page.id, record);
    await putIndex(record);
    return;
  }
  const bodies = chunkBody(text);
  const chunks: PageIndex["chunks"] = [];
  for (let i = 0; i < bodies.length; i += BATCH_CHUNKS) {
    await waitUntilRunnable();
    const batch = bodies.slice(i, i + BATCH_CHUNKS);
    const started = performance.now();
    const vectors = await embedTexts(batch.map(body => withTitle(title, body)));
    batch.forEach((body, index) => chunks.push({ text: body, vec: quantize(vectors[index]) }));
    await sleep((performance.now() - started) * sleepFactor());
  }
  const record: PageIndex = { id: page.id, updatedAt: page.updatedAt, hash, chunks };
  memory.set(page.id, record);
  await putIndex(record);
}

async function runCycle() {
  if (running) return;
  running = true;
  try {
    await ensureIndexLoaded();
    const candidates = allCandidates();
    if (!candidates.length) return;
    const alive = new Set(candidates.map(page => page.id));
    const stale = [...memory.keys()].filter(id => !alive.has(id));
    for (const id of stale) memory.delete(id);
    await deleteIndexes(stale);
    const now = Date.now();
    const todo = candidates
      .filter(page => memory.get(page.id)?.updatedAt !== page.updatedAt && now - page.updatedAt >= EDIT_DEBOUNCE_MS)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    for (const page of todo) {
      await waitUntilRunnable();
      await indexPage(page);
    }
  } catch { /* 模型不可用时静默退回关键词检索，稍后重试 */ }
  finally { running = false; }
}

/** 首次打开搜索面板时调用：开始（并立即扫描）后台索引。 */
export function kickSemanticIndexing() {
  armSemanticIndexing();
  started = true;
  void runCycle();
}

/** 应用就绪后调用一次：监听输入，用户空闲 30 秒后才开始懒加载模型，之后每 10 秒增量扫描。 */
export function armSemanticIndexing() {
  armActivity();
  if (ticking) return;
  ticking = true;
  setInterval(() => {
    if (!started) {
      if (idleMs() < IDLE_START_MS || shouldPause()) return;
      started = true;
    }
    void runCycle();
  }, TICK_MS);
}
