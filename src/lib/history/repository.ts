import { readRevisionHistoryVersion, invalidateHistoryVersion } from "./versionReadCache";
import { HostAdapter } from "@/lib/host/adapter";
import type { HistoryIndex, HistoryVersion } from "./types";
import { normalizeHistoryIndex } from "./guards";

const VERSION_PREFIX = "gn:hist:";
const INDEX_PREFIX = "gn:hist-idx:";

const versionKey = (pageId: string, versionId: string) =>
  `${VERSION_PREFIX}${pageId}:${versionId}`;
const indexKey = (pageId: string) => `${INDEX_PREFIX}${pageId}`;

const assertStorageOperation = (result: { ok: boolean; error?: unknown }): void => {
  if (!result.ok) {
    throw new Error(`history-storage-operation-failed: ${String(result.error ?? "unknown")}`);
  }
};

export const historyRepository = {
  loadIndex(pageId: string): HistoryIndex {
    const doc = HostAdapter.db.get<HistoryIndex>(indexKey(pageId));
    return normalizeHistoryIndex(doc?.data, pageId);
  },

  saveIndex(index: HistoryIndex): void {
    const key = indexKey(index.pageId);
    const existing = HostAdapter.db.get<HistoryIndex>(key);
    assertStorageOperation(HostAdapter.db.put(key, index, existing?._rev));
  },

  loadVersion(pageId: string, versionId: string): HistoryVersion | null {
    const doc = HostAdapter.db.get<HistoryVersion>(versionKey(pageId, versionId));
    return readRevisionHistoryVersion(versionKey(pageId, versionId), doc?._rev, doc?.data, pageId, versionId);
  },

  saveVersion(version: HistoryVersion): void {
    const key = versionKey(version.pageId, version.versionId);
    const existing = HostAdapter.db.get<HistoryVersion>(key);
    invalidateHistoryVersion(key);
    assertStorageOperation(HostAdapter.db.put(key, version, existing?._rev));
  },

  removeVersion(pageId: string, versionId: string): void {
    invalidateHistoryVersion(versionKey(pageId, versionId));
    assertStorageOperation(HostAdapter.db.remove(versionKey(pageId, versionId)));
  },

  dropAll(pageId: string): void {
    const versions = HostAdapter.db.allDocs<HistoryVersion>(
      `${VERSION_PREFIX}${pageId}:`,
    );
    versions.forEach((doc) => {
      invalidateHistoryVersion(doc._id);
      assertStorageOperation(HostAdapter.db.remove(doc._id));
    });
    assertStorageOperation(HostAdapter.db.remove(indexKey(pageId)));
  },

  clearAll(): void {
    HostAdapter.db
      .allDocs<HistoryVersion>(VERSION_PREFIX)
      .forEach((doc) => {
        invalidateHistoryVersion(doc._id);
        assertStorageOperation(HostAdapter.db.remove(doc._id));
      });
    HostAdapter.db
      .allDocs<HistoryIndex>(INDEX_PREFIX)
      .forEach((doc) => {
        invalidateHistoryVersion(doc._id);
        assertStorageOperation(HostAdapter.db.remove(doc._id));
      });
  },
};
