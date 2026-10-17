
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/math/mathWorkerClient.ts#messages:1">`
zh-Hans:
  formulaRenderingFailed: "公式渲染失败"
  backgroundFormulaRenderingFailedPleaseRetry: "公式后台渲染失败，请重试"
  couldNotCommunicateWithTheFormulaRendererPlease: "公式后台通信失败，请重试"
  formulaRenderingTimedOutPleaseRetry: "公式渲染超时，请重试"
en:
  formulaRenderingFailed: "Formula rendering failed"
  backgroundFormulaRenderingFailedPleaseRetry: "Background formula rendering failed. Please retry."
  couldNotCommunicateWithTheFormulaRendererPlease: "Could not communicate with the formula renderer. Please retry."
  formulaRenderingTimedOutPleaseRetry: "Formula rendering timed out. Please retry."
`;
const t = createTranslator(messages);
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
      else request.reject(new Error(data.error && data.error !== "math_render_failed" ? data.error : t("formulaRenderingFailed")));
    };
    worker.onerror = () => reset(new Error(t("backgroundFormulaRenderingFailedPleaseRetry")));
    worker.onmessageerror = () => reset(new Error(t("couldNotCommunicateWithTheFormulaRendererPlease")));
  }
  const id = ++nextId;
  const result = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reset(new Error(t("formulaRenderingTimedOutPleaseRetry"))), 15000);
    requests.set(id, { resolve, reject, timer });
  });
  try { worker.postMessage({ id, value, displayMode }); }
  catch { reset(new Error(t("couldNotCommunicateWithTheFormulaRendererPlease"))); }
  return result;
}
