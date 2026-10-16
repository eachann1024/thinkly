const IDLE_RELEASE_MS = 5 * 60 * 1000;
const FAILURE_BACKOFF_MS = 10 * 60 * 1000;
const QUERY_PREFIX = "为这个句子生成表示以用于检索相关文章：";

type Pending = { resolve: (value: Float32Array[]) => void; reject: (error: Error) => void };
let worker: Worker | null = null;
let nextId = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let failedAt = 0;
const pending = new Map<number, Pending>();

function resolveBase(directory: string) {
  // 打包版页面是 file://，fetch 读不了，改走主进程注册的 goose-model 协议。
  if (location.protocol === "file:") return `goose-model://bundle/${directory}/`;
  return new URL(`${import.meta.env.BASE_URL}${directory}/`, document.baseURI).href;
}

function release(error?: Error) {
  worker?.terminate();
  worker = null;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  const failure = error ?? new Error("语义向量 Worker 已释放");
  for (const request of pending.values()) request.reject(failure);
  pending.clear();
  if (error) failedAt = Date.now();
}

function touch() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!pending.size) release(); else touch(); }, IDLE_RELEASE_MS);
}

function ensureWorker(): Worker {
  if (worker) return worker;
  if (Date.now() - failedAt < FAILURE_BACKOFF_MS) throw new Error("语义向量模型暂不可用");
  const next = new Worker(new URL("./embedding.worker.ts", import.meta.url), { type: "module" });
  next.onmessage = ({ data }: MessageEvent<{ id: number; vectors?: Float32Array; dim?: number; error?: string }>) => {
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (!data.vectors || !data.dim) { request.reject(new Error(data.error || "向量计算失败")); return; }
    const dim = data.dim;
    request.resolve(Array.from({ length: data.vectors.length / dim }, (_, i) => data.vectors!.subarray(i * dim, (i + 1) * dim)));
  };
  next.onerror = () => release(new Error("语义向量 Worker 加载失败"));
  next.onmessageerror = () => release(new Error("语义向量 Worker 通信失败"));
  next.postMessage({ type: "init", modelBase: resolveBase("models"), ortBase: resolveBase("ort") });
  worker = next;
  return next;
}

/** 调用方保证串行派发（一次只有一个批次在途），查询因此最多等待一个小批次。 */
export function embedTexts(texts: string[]): Promise<Float32Array[]> {
  return new Promise((resolve, reject) => {
    try {
      const target = ensureWorker();
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      touch();
      target.postMessage({ type: "embed", id, texts });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function embedQuery(question: string): Promise<Float32Array> {
  const [vector] = await embedTexts([QUERY_PREFIX + question]);
  return vector;
}

export function isEmbeddingWorkerAlive() {
  return worker !== null;
}
