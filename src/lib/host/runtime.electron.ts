import type {
  HostDoc,
  HostRuntime,
  HostPutResult,
  HostRemoveResult,
} from "./types";

const MONOLITH_KEY = "thinkly:web-db";
const OVERLAY_KEY = "thinkly:web-db:overlay";
const DOC_PREFIX = "thinkly:web-doc:";

type Overlay = Record<string, "put" | "del">;

let documents: Record<string, HostDoc<unknown>> | null = null;
let watching = false;

const storage = (): Storage => {
  if (typeof window === "undefined") throw new Error("local-storage-unavailable");
  return window.localStorage;
};

const isDoc = (id: string, value: unknown): value is HostDoc<unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value) &&
    "_id" in value && value._id === id && "data" in value &&
    (!("_rev" in value) || value._rev === undefined || typeof value._rev === "string"));

const readMonolith = (): Record<string, HostDoc<unknown>> => {
  const raw = storage().getItem(MONOLITH_KEY);
  if (raw === null) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("local-storage-invalid-document-map");
  }
  for (const [id, value] of Object.entries(parsed)) {
    if (!isDoc(id, value)) throw new Error("local-storage-invalid-document");
  }
  return parsed as Record<string, HostDoc<unknown>>;
};

const readOverlay = (): Overlay => {
  const raw = storage().getItem(OVERLAY_KEY);
  if (raw === null) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("local-storage-invalid-document-map");
  }
  const overlay: Overlay = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (value !== "put" && value !== "del") throw new Error("local-storage-invalid-document");
    overlay[id] = value;
  }
  return overlay;
};

const watchStorage = (): void => {
  if (watching || typeof window === "undefined" || typeof window.addEventListener !== "function") return;
  watching = true;
  window.addEventListener("storage", (event) => {
    const key = event.key;
    if (key === null || key === MONOLITH_KEY || key === OVERLAY_KEY || key.startsWith(DOC_PREFIX)) {
      documents = null;
    }
  });
};

const loadDocuments = (): Record<string, HostDoc<unknown>> => {
  watchStorage();
  if (documents) return documents;
  const docs = readMonolith();
  for (const [id, state] of Object.entries(readOverlay())) {
    if (state === "del") {
      delete docs[id];
      continue;
    }
    const raw = storage().getItem(DOC_PREFIX + id);
    if (raw === null) continue;
    const parsed: unknown = JSON.parse(raw);
    if (!isDoc(id, parsed)) throw new Error("local-storage-invalid-document");
    docs[id] = parsed;
  }
  documents = docs;
  return docs;
};

const writeDoc = (id: string, doc: HostDoc<unknown> | null, state: "put" | "del"): boolean => {
  const store = storage();
  const key = DOC_PREFIX + id;
  if (doc) store.setItem(key, JSON.stringify(doc));
  else store.removeItem(key);
  const overlay = readOverlay();
  if (overlay[id] === state) return true;
  overlay[id] = state;
  store.setItem(OVERLAY_KEY, JSON.stringify(overlay));
  return true;
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
      let docs: Record<string, HostDoc<unknown>>;
      try { docs = loadDocuments(); }
      catch { return { id, ok: false, error: "local-storage-read-failed" }; }
      const previous = docs[id];
      const nextRev = nextWebRev(rev || previous?._rev);
      const next: HostDoc<T> = { _id: id, _rev: nextRev, data };
      docs[id] = next;
      try { writeDoc(id, next, "put"); }
      catch {
        if (previous) docs[id] = previous;
        else delete docs[id];
        return { id, ok: false, error: "local-storage-write-failed" };
      }
      return { id, ok: true, rev: nextRev };
    },
    get: <T>(id: string): HostDoc<T> | null => {
      const docs = loadDocuments();
      return Object.hasOwn(docs, id) ? docs[id] as HostDoc<T> : null;
    },
    remove: (id: string): HostRemoveResult => {
      let docs: Record<string, HostDoc<unknown>>;
      try { docs = loadDocuments(); }
      catch { return { id, ok: false, error: "local-storage-read-failed" }; }
      const previous = docs[id];
      delete docs[id];
      try { writeDoc(id, null, "del"); }
      catch {
        if (previous) docs[id] = previous;
        return { id, ok: false, error: "local-storage-write-failed" };
      }
      void electronAttachments()
        .then((mod) => mod.removeAttachment(id))
        .catch(() => {});
      return { id, ok: true };
    },
    allDocs: <T>(prefix = ""): Array<HostDoc<T>> => {
      return Object.values(loadDocuments()).filter((doc) =>
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
