import katex from "katex";

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ id: number; value: string; displayMode: boolean }>) => void) | null;
  postMessage: (reply: { id: number; html?: string; error?: string }) => void;
};
scope.onmessage = ({ data }) => {
  try {
    const html = katex.renderToString(data.value || "\\text{empty}", {
      displayMode: data.displayMode, throwOnError: false,
    });
    scope.postMessage({ id: data.id, html });
  } catch (error) {
    scope.postMessage({ id: data.id, error: error instanceof Error ? error.message : "公式渲染失败" });
  }
};
