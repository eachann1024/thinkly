import { resolveHistoryBackend } from "@/lib/history/backend";
import { usePages } from "@/stores/usePages";
import { countWords } from "@/components/editor/utils/content-text-extractor";
import type { Page } from "@/types";

export interface EditEvent {
  pageId: string;
  at: number;
  /** 该次编辑新增的字数（charDelta 的正值）。 */
  added: number;
}

const READ_CONCURRENCY = 4;

interface CacheEntry {
  pageUpdatedAt: number;
  events: EditEvent[];
}

/** 内存缓存：pageId -> 历史事件。页面 updatedAt 变化时才重读该页。 */
const cache = new Map<string, CacheEntry>();

export function isEditablePage(page: Page): boolean {
  return !page.isFolder && !page.trashedAt && !page.editorDraft && page.id !== "__quicknote_draft__";
}

async function readPageEvents(page: Page): Promise<EditEvent[]> {
  const index = await resolveHistoryBackend(page.id).loadIndex(page.id);
  const events = index.versions.map((v) => ({
    pageId: page.id,
    at: v.createdAt,
    added: Math.max(0, v.charDelta),
  }));
  // 没有历史记录：用 updatedAt 补成一次事件。
  if (events.length > 0) return events;
  const added = Math.max(0, countWords(page.content));
  return [{ pageId: page.id, at: page.updatedAt || page.createdAt, added }];
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) await worker(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

const inflightPages = new Map<string, Promise<void>>();
const inflightBatches = new Map<string, Promise<EditEvent[]>>();

/** 按 pageId 共享进行中的读取；失败时不缓存，下次重试。 */
function refreshPage(page: Page): Promise<void> {
  const running = inflightPages.get(page.id);
  if (running) return running;
  const task = readPageEvents(page)
    .then((events) => {
      cache.set(page.id, { pageUpdatedAt: page.updatedAt, events });
    })
    .catch(() => {
      cache.delete(page.id);
    })
    .finally(() => {
      inflightPages.delete(page.id);
    });
  inflightPages.set(page.id, task);
  return task;
}

async function loadBatch(since: number, force: boolean): Promise<EditEvent[]> {
  const pages = Object.values(usePages.getState().pages).filter(
    (p) => isEditablePage(p) && Math.max(p.updatedAt, p.createdAt) >= since,
  );
  const stale = pages.filter((p) => force || cache.get(p.id)?.pageUpdatedAt !== p.updatedAt);
  await runPool(stale, READ_CONCURRENCY, (page) => refreshPage(page));
  return pages.flatMap((p) => cache.get(p.id)?.events ?? []);
}

/**
 * 读取 since 之后有过动静的页面的历史事件（本地文件夹与数据库笔记都经 resolveHistoryBackend 路由）。
 * 并发受控；进行中的整批与单页读取均去重；已缓存且页面未再变化的不重读，force 时全部重读。
 */
export function loadEditEvents(since: number, force = false): Promise<EditEvent[]> {
  const key = `${since}:${force}`;
  const running = inflightBatches.get(key);
  if (running) return running;
  const task = loadBatch(since, force).finally(() => inflightBatches.delete(key));
  inflightBatches.set(key, task);
  return task;
}
