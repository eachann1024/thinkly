
import { historyRepository } from "./repository";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import type { HistoryIndex, HistoryVersion } from "./types";
import { makeLocalFolderHistoryBackend } from "./localBackend";
import { canonicalRelativePath } from "../canonicalLocalPath";


export interface HistoryBackend {
  loadIndex(pageId: string): Promise<HistoryIndex>;
  saveIndex(index: HistoryIndex): Promise<void>;
  loadVersion(pageId: string, versionId: string): Promise<HistoryVersion | null>;
  saveVersion(version: HistoryVersion): Promise<void>;
  removeVersion(pageId: string, versionId: string): Promise<void>;
  dropAll(pageId: string): Promise<void>;
}


export const dbBackend: HistoryBackend = {
  async loadIndex(pageId) {
    return historyRepository.loadIndex(pageId);
  },
  async saveIndex(index) {
    historyRepository.saveIndex(index);
  },
  async loadVersion(pageId, versionId) {
    return historyRepository.loadVersion(pageId, versionId);
  },
  async saveVersion(version) {
    historyRepository.saveVersion(version);
  },
  async removeVersion(pageId, versionId) {
    historyRepository.removeVersion(pageId, versionId);
  },
  async dropAll(pageId) {
    historyRepository.dropAll(pageId);
  },
};

export function resolveHistoryBackend(pageId: string): HistoryBackend {
  const page = usePages.getState().pages[pageId];
  if (!page?.localFilePath) return dbBackend;

  const notebook = useNotebooks.getState().notebooks[page.workspaceId];
  if (!notebook?.localPath) return dbBackend;

  return makeLocalFolderHistoryBackend(notebook.localPath, (id) => {
    const path = usePages.getState().pages[id]?.localFilePath;
    return path ? canonicalRelativePath(notebook.localPath!, path) : null;
  });
}
