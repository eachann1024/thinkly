export interface StoredChunk { text: string; vec: Int8Array }
export interface PageIndex { id: string; updatedAt: number; hash: string; chunks: StoredChunk[] }

const STORE = "pages";
let database: Promise<IDBDatabase | null> | null = null;

function openDatabase() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  database ??= new Promise<IDBDatabase | null>(resolve => {
    const request = indexedDB.open("goose-semantic-index-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = request.onblocked = () => resolve(null);
  });
  return database;
}

export async function loadAllIndexes(): Promise<PageIndex[]> {
  try {
    const db = await openDatabase();
    if (!db) return [];
    return await new Promise(resolve => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result as PageIndex[]);
      request.onerror = () => resolve([]);
    });
  } catch { return []; }
}

export async function putIndex(record: PageIndex) {
  try {
    const db = await openDatabase();
    if (!db) return;
    await new Promise<void>(resolve => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(record);
      transaction.oncomplete = transaction.onerror = transaction.onabort = () => resolve();
    });
  } catch { /* 索引只是加速手段，写入失败不影响使用 */ }
}

export async function deleteIndexes(ids: string[]) {
  if (!ids.length) return;
  try {
    const db = await openDatabase();
    if (!db) return;
    await new Promise<void>(resolve => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      for (const id of ids) store.delete(id);
      transaction.oncomplete = transaction.onerror = transaction.onabort = () => resolve();
    });
  } catch { /* 同上 */ }
}
