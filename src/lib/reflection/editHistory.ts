import { resolveHistoryBackend } from "@/lib/history/backend";
import { getHistoryIndexRevision } from "@/lib/history/indexRevision";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";

export interface EditEvent {
  pageId: string;
  at: number;
  added: number;
}

const READ_CONCURRENCY = 4;

interface CacheEntry {
  pageUpdatedAt: number;
  historyRevision: number;
  events: EditEvent[];
}

const cache = new Map<string, CacheEntry>();

export function isEditablePage(page: Page): boolean {
  return !page.isFolder && !page.trashedAt && !page.editorDraft && page.id !== "__quicknote_draft__";
}

async function readPageEvents(page: Page): Promise<EditEvent[]> {
  const index = await resolveHistoryBackend(page.id).loadIndex(page.id);
  return index.versions.flatMap((v, position) => {
    // Legacy first snapshots counted the entire existing note from zero.
    // Without an observed editing baseline, that content is not proven activity.
    if (v.editCharDelta === undefined && position === 0 && v.charDelta === v.charCount) return [];
    return [{
      pageId: page.id,
      at: v.createdAt,
      added: Math.max(0, v.editCharDelta ?? v.charDelta),
    }];
  });
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

function refreshPage(page: Page): Promise<void> {
  const running = inflightPages.get(page.id);
  if (running) return running;
  let historyRevision = getHistoryIndexRevision(page.id);
  const task = readPageEvents(page)
    .then(async (events) => {
      if (historyRevision !== getHistoryIndexRevision(page.id)) {
        historyRevision = getHistoryIndexRevision(page.id);
        events = await readPageEvents(page);
      }
      cache.set(page.id, { pageUpdatedAt: page.updatedAt, historyRevision, events });
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
  const stale = pages.filter((p) => force || cache.get(p.id)?.pageUpdatedAt !== p.updatedAt ||
    cache.get(p.id)?.historyRevision !== getHistoryIndexRevision(p.id));
  await runPool(stale, READ_CONCURRENCY, (page) => refreshPage(page));
  return pages.flatMap((p) => cache.get(p.id)?.events ?? []);
}

export function loadEditEvents(since: number, force = false): Promise<EditEvent[]> {
  const key = `${since}:${force}`;
  const running = inflightBatches.get(key);
  if (running) return running;
  const task = loadBatch(since, force).finally(() => inflightBatches.delete(key));
  inflightBatches.set(key, task);
  return task;
}
