import type { HostDoc } from "./types";

const LEGACY_KEY = "thinkly:web-db";
const DOC_PREFIX = "thinkly:web-db:doc:v1:";
const TOMBSTONE = "null";
let owner: Storage | undefined;
let legacy: Record<string, HostDoc<unknown>> | undefined;
const documents = new Map<string, { raw: string; doc: HostDoc<unknown> | null }>();
const serialized = new WeakMap<HostDoc<unknown>, string>();

function dataJSON(doc: HostDoc<unknown>): string | undefined {
  let raw = serialized.get(doc);
  if (raw === undefined) {
    raw = JSON.stringify(doc.data);
    if (raw !== undefined) serialized.set(doc, raw);
  }
  return raw;
}

function storage(): Storage {
  if (typeof window === "undefined") throw new Error("local-storage-unavailable");
  const current = window.localStorage;
  if (owner !== current) {
    owner = current;
    legacy = undefined;
    documents.clear();
  }
  return current;
}

function validate(value: unknown, id: string): HostDoc<unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    !("_id" in value) || value._id !== id || !("data" in value) ||
    ("_rev" in value && value._rev !== undefined && typeof value._rev !== "string")) {
    throw new Error("local-storage-invalid-document");
  }
  return value as HostDoc<unknown>;
}

function readLegacy(): Record<string, HostDoc<unknown>> {
  const current = storage();
  if (legacy) return legacy;
  const raw = current.getItem(LEGACY_KEY);
  const parsed: unknown = raw === null ? {} : JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("local-storage-invalid-document-map");
  }
  for (const [id, value] of Object.entries(parsed)) validate(value, id);
  legacy = parsed as Record<string, HostDoc<unknown>>;
  return legacy;
}

const keyFor = (id: string) => `${DOC_PREFIX}${encodeURIComponent(id)}`;

// Read the individual key synchronously, so another window's completed write is
// visible even before its storage event arrives. Only parsing is cached.
function readDocument(id: string): HostDoc<unknown> | null {
  const raw = storage().getItem(keyFor(id));
  if (raw === null) {
    const base = readLegacy();
    return Object.hasOwn(base, id) ? base[id] : null;
  }
  const cached = documents.get(id);
  if (cached?.raw === raw) return cached.doc;
  const doc = raw === TOMBSTONE ? null : validate(JSON.parse(raw), id);
  documents.set(id, { raw, doc });
  return doc;
}

export function getElectronDocument<T>(id: string): HostDoc<T> | null {
  // Preserve the old adapter's isolated return values: callers cannot mutate
  // the durable-state cache without a successful put.
  return structuredClone(readDocument(id)) as HostDoc<T> | null;
}

export function putElectronDocument<T>(id: string, data: T, rev?: string): string {
  const current = readDocument(id);
  const serializedData = JSON.stringify(data);
  if (serializedData === undefined) throw new Error("local-storage-invalid-document");
  // Identical writes have already crossed the synchronous durability boundary.
  if (current && dataJSON(current) === serializedData) return current._rev ?? "0";
  const generation = Number(String(rev || current?._rev || "0").split("-")[0] || 0) + 1;
  const nextRev = `${generation}-${Date.now().toString(36)}`;
  const raw = `{"_id":${JSON.stringify(id)},"_rev":${JSON.stringify(nextRev)},"data":${serializedData}}`;
  storage().setItem(keyFor(id), raw);
  // Never publish an uncommitted value to the cache after a quota/write error.
  const doc = JSON.parse(raw) as HostDoc<unknown>;
  serialized.set(doc, serializedData);
  documents.set(id, { raw, doc });
  return nextRev;
}

export function removeElectronDocument(id: string): void {
  const current = storage();
  if (current.getItem(keyFor(id)) !== TOMBSTONE) {
    // Retain the legacy baseline. A durable tombstone prevents resurrection,
    // including if the process dies immediately after this single-key write.
    current.setItem(keyFor(id), TOMBSTONE);
  }
  documents.set(id, { raw: TOMBSTONE, doc: null });
}

export function allElectronDocuments<T>(prefix = ""): Array<HostDoc<T>> {
  const current = storage();
  const ids = new Set(Object.keys(readLegacy()).filter(id => id.startsWith(prefix)));
  for (let index = 0; index < current.length; index += 1) {
    const key = current.key(index);
    if (!key?.startsWith(DOC_PREFIX)) continue;
    const id = decodeURIComponent(key.slice(DOC_PREFIX.length));
    if (id.startsWith(prefix)) ids.add(id);
  }
  return [...ids].flatMap(id => {
    const doc = getElectronDocument<T>(id);
    return doc ? [doc] : [];
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    if (event.storageArea && event.storageArea !== owner) return;
    if (event.key === null || event.key === LEGACY_KEY) legacy = undefined;
    if (event.key === null) documents.clear();
  });
}
