/** Electron 本地文档、磁盘附件和 gooseFs 初始化。 */
import type {
  HostDoc,
  HostRuntime,
  HostPutResult,
  HostRemoveResult,
} from "./types";

const WEB_DB_STORAGE_KEY = "thinkly:web-db";

const readWebDb = (): Record<string, HostDoc<unknown>> => {
  if (typeof window === "undefined") throw new Error("local-storage-unavailable");
  const raw = window.localStorage.getItem(WEB_DB_STORAGE_KEY);
  if (raw === null) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("local-storage-invalid-document-map");
  }
  for (const [id, value] of Object.entries(parsed)) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
      !("_id" in value) || value._id !== id || !("data" in value) ||
      ("_rev" in value && value._rev !== undefined && typeof value._rev !== "string")) {
      throw new Error("local-storage-invalid-document");
    }
  }
  return parsed as Record<string, HostDoc<unknown>>;
};

const writeWebDb = (db: Record<string, HostDoc<unknown>>): boolean => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(WEB_DB_STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
};

const nextWebRev = (current?: string): string => {
  const rev = Number(String(current || "0").split("-")[0] || 0) + 1;
  return `${rev}-${Date.now().toString(36)}`;
};

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
      let db: Record<string, HostDoc<unknown>>;
      try { db = readWebDb(); }
      catch { return { id, ok: false, error: "local-storage-read-failed" }; }
      const nextRev = nextWebRev(rev || db[id]?._rev);
      db[id] = { _id: id, _rev: nextRev, data };
      if (!writeWebDb(db)) {
        return { id, ok: false, error: "local-storage-write-failed" };
      }
      return { id, ok: true, rev: nextRev };
    },
    get: <T>(id: string): HostDoc<T> | null => {
      const db = readWebDb();
      return Object.hasOwn(db, id) ? db[id] as HostDoc<T> : null;
    },
    remove: (id: string): HostRemoveResult => {
      let db: Record<string, HostDoc<unknown>>;
      try { db = readWebDb(); }
      catch { return { id, ok: false, error: "local-storage-read-failed" }; }
      delete db[id];
      if (!writeWebDb(db)) {
        return { id, ok: false, error: "local-storage-write-failed" };
      }
      void electronAttachments()
        .then((mod) => mod.removeAttachment(id))
        .catch(() => {});
      return { id, ok: true };
    },
    allDocs: <T>(prefix = ""): Array<HostDoc<T>> => {
      return Object.values(readWebDb()).filter((doc) =>
        doc._id.startsWith(prefix),
      ) as Array<HostDoc<T>>;
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
