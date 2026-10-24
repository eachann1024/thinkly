import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { ensureHistoryLayout } from "./legacyMigration";
import { invalidatePortableIds, listHistoryEntries, readHistoryMetaAt, yieldToMain } from "./layout";
import { historyDiskOperation, rendererHistoryDisk, type HistoryDisk } from "./localDisk";
import { HISTORY_TOMBSTONE_TTL_MS, clearHistoryTombstones, listHistoryTombstones, recordHistoryTombstones } from "./tombstones";

const STARTUP_DELAY_MS = 8_000;

const whenIdle = () => new Promise<void>((resolve) => {
  if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 5_000 });
  else setTimeout(resolve, 50);
});

const pageIsLive = (pageId: string) => Boolean(usePages.getState().pages[pageId]?.localFilePath);

async function rootLooksIntact(basePath: string, fs: HistoryDisk) {
  try {
    return await fs.exists(`${basePath}/.goose/notebook.json`) && (await fs.readDir(basePath)).length > 0;
  } catch { return false; }
}

async function housekeepNotebook(notebookId: string, basePath: string, fs: HistoryDisk, now: number) {
  if (!await rootLooksIntact(basePath, fs)) return;
  await historyDiskOperation(basePath, () => ensureHistoryLayout(basePath, fs));
  const entries = await listHistoryEntries(basePath, fs);
  const tombstones = listHistoryTombstones(notebookId);
  const missing: typeof entries = [];
  const alive: string[] = [];
  for (const [position, entry] of entries.entries()) {
    if (position % 16 === 15) await whenIdle();
    const path = entry.meta.relativePath;
    if (!path) continue;
    if (pageIsLive(entry.meta.pageId) || await fs.exists(`${basePath}/${path}`)) alive.push(entry.meta.pageId);
    else missing.push(entry);
  }
  clearHistoryTombstones(notebookId, alive);
  if (!alive.length) return;
  recordHistoryTombstones(notebookId, missing.map((entry) => entry.meta.pageId), now);

  const expired = (id: string) => now - (tombstones[id] ?? now) >= HISTORY_TOMBSTONE_TTL_MS;
  const purged: string[] = [];
  for (const entry of missing.filter((item) => expired(item.meta.pageId))) {
    await yieldToMain();
    await historyDiskOperation(basePath, async () => {
      const fresh = await readHistoryMetaAt(entry.dir, fs).catch(() => null);
      if (!fresh || fresh.pageId !== entry.meta.pageId || !fresh.relativePath) return;
      if (pageIsLive(fresh.pageId) || await fs.exists(`${basePath}/${fresh.relativePath}`)) return;
      if (!await rootLooksIntact(basePath, fs)) return;
      if (await fs.deleteDir(entry.dir)) purged.push(fresh.pageId);
    });
  }
  const known = new Set(entries.map((entry) => entry.meta.pageId));
  const stale = Object.keys(tombstones).filter((id) => !known.has(id) && expired(id));
  clearHistoryTombstones(notebookId, [...purged, ...stale]);
  if (purged.length) invalidatePortableIds(basePath);
}

let scheduled = false;
export function scheduleHistoryHousekeeping(): void {
  if (scheduled || typeof window === "undefined") return;
  scheduled = true;
  setTimeout(() => {
    void (async () => {
      await whenIdle();
      const fs = rendererHistoryDisk();
      if (!fs) return;
      for (const notebook of Object.values(useNotebooks.getState().notebooks)) {
        if (notebook.source !== "local-folder" || !notebook.localPath || notebook.localPathMissing) continue;
        const loadStatus = useNotebooks.getState().localFolderLoadStates[notebook.id]?.status;
        if (loadStatus === "loading" || loadStatus === "error") continue;
        try {
          if (await fs.exists(notebook.localPath)) await housekeepNotebook(notebook.id, notebook.localPath, fs, Date.now());
        } catch (error) {
          console.warn("[history] 历史对账失败", notebook.localPath, error);
        }
        await whenIdle();
      }
    })();
  }, STARTUP_DELAY_MS);
}
