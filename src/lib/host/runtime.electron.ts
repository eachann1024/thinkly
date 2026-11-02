import type {
  HostDoc,
  HostRuntime,
  HostPutResult,
  HostRemoveResult,
} from "./types";

import {
  allElectronDocuments,
  getElectronDocument,
  putElectronDocument,
  removeElectronDocument,
} from "./electronDocumentStorage";

const electronAttachments = () => import("@/lib/electron/attachments");

export const hostRuntime: HostRuntime = {
  ensureGooseFs: async () => {
    if (typeof window === "undefined" || window.gooseFs) return;
    try {
      const { installElectronGooseFs } = await import("@/lib/electron/gooseFs");
      installElectronGooseFs();
      const { migrateLegacyAttachments } = await import("@/lib/electron/attachments");
      void migrateLegacyAttachments();
    } catch (err) {
      console.warn("[runtime.electron] gooseFs 注入失败", err);
    }
  },
  db: {
    put: <T>(id: string, data: T, rev?: string): HostPutResult => {
      try {
        return { id, ok: true, rev: putElectronDocument(id, data, rev) };
      } catch {
        return { id, ok: false, error: "local-storage-write-failed" };
      }
    },
    get: <T>(id: string): HostDoc<T> | null => {
      return getElectronDocument<T>(id);
    },
    remove: (id: string): HostRemoveResult => {
      try { removeElectronDocument(id); }
      catch { return { id, ok: false, error: "local-storage-write-failed" }; }
      void electronAttachments()
        .then((mod) => mod.removeAttachment(id))
        .catch(() => {});
      return { id, ok: true };
    },
    allDocs: <T>(prefix = ""): Array<HostDoc<T>> => {
      return allElectronDocuments<T>(prefix);
    },
    postAttachment: async (id: string, data: Uint8Array, type: string) => {
      const mod = await electronAttachments();
      return mod.postAttachment(id, data, type);
    },
    getAttachment: async (id: string) => {
      const mod = await electronAttachments();
      return mod.getAttachment(id);
    },
    getAttachmentType: async (id: string) => {
      const mod = await electronAttachments();
      return mod.getAttachmentType(id);
    },
  },
};
