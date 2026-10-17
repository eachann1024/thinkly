import "../../i18n/core";
import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/preview-renderer/renderer.ts#localMessages:1">`
zh-Hans:
  couldnTRenderTheChart: "图表渲染失败"
en:
  couldnTRenderTheChart: "Couldn’t render the chart"
`;
const uiText = createTranslator(localMessages);
import "katex/dist/katex.min.css";
import { renderCachedMermaid } from "../imageExport/mermaidCache";
import { ensurePersistentRemoteFont } from "../fontLoader";
import type { PreviewWorkerBridge } from "./contract";

const bridge = (window as unknown as { goosePreviewWorker: PreviewWorkerBridge }).goosePreviewWorker;
let queue = Promise.resolve();
const queued = new Set<number>();
const cancelled = new Set<number>();
if (bridge) {
  bridge.onCancel(id => { if (queued.has(id)) cancelled.add(id); });
  bridge.onRequest(job => {
    queued.add(job.id);
    queue = queue.then(async () => {
      try {
        if (cancelled.has(job.id)) return;
        document.body.style.fontFamily = job.options.fontFamily || "sans-serif";
        if (job.options.fontFamily?.includes("仓耳今楷")) await ensurePersistentRemoteFont("仓耳今楷");
        await document.fonts.ready;
        const svg = await renderCachedMermaid(job.source, job.options, job.context, job.fontIdentity);
        if (!cancelled.has(job.id)) bridge.reply({ id: job.id, svg });
      } catch (error) {
        if (!cancelled.has(job.id)) bridge.reply({ id: job.id, error: error instanceof Error ? error.message : uiText("couldnTRenderTheChart") });
      } finally {
        queued.delete(job.id); cancelled.delete(job.id);
      }
    });
  });
  bridge.ready();
}
