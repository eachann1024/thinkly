let worker: Worker | null = null;
let nextId = 0;
const requests = new Map<number, {
  resolve: (html: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

function reset(error: Error) {
  worker?.terminate(); worker = null;
  for (const request of requests.values()) {
    clearTimeout(request.timer); request.reject(error);
  }
  requests.clear();
}

export function renderMathInWorker(value: string, displayMode: boolean): Promise<string> {
  if (!worker) {
    worker = new Worker(new URL("./math.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<{ id: number; html?: string; error?: string }>) => {
      const request = requests.get(data.id);
      if (!request) return;
      requests.delete(data.id); clearTimeout(request.timer);
      if (data.html !== undefined) request.resolve(data.html);
      else request.reject(new Error(data.error || "公式渲染失败"));
    };
    worker.onerror = () => reset(new Error("公式后台渲染失败，请重试"));
    worker.onmessageerror = () => reset(new Error("公式后台通信失败，请重试"));
  }
  const id = ++nextId;
  const result = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reset(new Error("公式渲染超时，请重试")), 15000);
    requests.set(id, { resolve, reject, timer });
  });
  try { worker.postMessage({ id, value, displayMode }); }
  catch { reset(new Error("公式后台通信失败，请重试")); }
  return result;
}
