const STORE = "svg";
const METADATA = "metadata";
const MAX_ENTRIES = 64;
const MAX_BYTES = 16 * 1024 * 1024;
let database: Promise<IDBDatabase | null> | null = null;

function openCache() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  database ??= new Promise<IDBDatabase | null>(resolve => {
    const request = indexedDB.open("goose-mermaid-previews-v1", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
      const metadata = db.createObjectStore(METADATA, { keyPath: "key" });
      const existing = request.transaction!.objectStore(STORE).openCursor();
      existing.onsuccess = () => {
        const cursor = existing.result;
        if (!cursor) return;
        const { key, size, updated } = cursor.value;
        metadata.put({ key, size, updated }); cursor.continue();
      };
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = request.onblocked = () => resolve(null);
  });
  return database;
}

export async function previewCacheKey(key: string) {
  if (!globalThis.crypto?.subtle) return null;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mermaid-11.15-preview-v1:" + key));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function readPersistedPreview(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    const db = await openCache();
    if (!db) return null;
    return await new Promise(resolve => {
      const request = db.transaction(STORE).objectStore(STORE).get(key);
      request.onsuccess = () => resolve(typeof request.result?.svg === "string" ? request.result.svg : null);
      request.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function persistPreview(key: string | null, svg: string) {
  const size = svg.length * 2;
  if (!key || size > MAX_BYTES) return;
  try {
    const db = await openCache();
    if (!db) return;
    await new Promise<void>(resolve => {
      const transaction = db.transaction([STORE, METADATA], "readwrite");
      const store = transaction.objectStore(STORE);
      const metadata = transaction.objectStore(METADATA);
      store.put({ key, svg, size, updated: Date.now() });
      metadata.put({ key, size, updated: Date.now() });
      // Eviction only reads small metadata records, never clones all cached SVG strings.
      const all = metadata.getAll();
      all.onsuccess = () => {
        const entries = all.result.sort((a, b) => a.updated - b.updated);
        let bytes = entries.reduce((sum, entry) => sum + entry.size, 0);
        let count = entries.length;
        for (const entry of entries) {
          if (count <= MAX_ENTRIES && bytes <= MAX_BYTES) break;
          store.delete(entry.key); metadata.delete(entry.key); count--; bytes -= entry.size;
        }
      };
      transaction.oncomplete = transaction.onerror = transaction.onabort = () => resolve();
    });
  } catch { /* The preview remains usable if storage is unavailable or full. */ }
}
