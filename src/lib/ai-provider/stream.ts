import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/ai-provider/stream.ts#localMessages:1">`
zh-Hans:
  couldnTReadTheResponseStream: "无法读取底层数据流"
en:
  couldnTReadTheResponseStream: "Couldn’t read the response stream"
ja:
  couldnTReadTheResponseStream: "レスポンスストリームを読み取れませんでした"
`;
const uiText = createTranslator(localMessages);
// --- Native SSE Parser Utilities ---
export async function* readSSELines(response: Response, signal: AbortSignal) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error(uiText("couldnTReadTheResponseStream"));

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let eolIndex;
      while ((eolIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, eolIndex).trim();
        buffer = buffer.slice(eolIndex + 1);
        if (line) yield line;
      }
    }
    if (buffer.trim()) yield buffer.trim();
  } finally {
    reader.releaseLock();
  }
}
