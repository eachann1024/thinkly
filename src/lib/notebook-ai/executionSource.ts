import type { NotebookAiExecutionSource } from "./types";

export function readExecutionSource(type: string, value: unknown, toolCallId?: string): NotebookAiExecutionSource | undefined {
  if (!value || typeof value !== "object") return;
  const output = value as Record<string, unknown>;
  if (output.error || output.ok === false) return;
  if (type === "tool-readPage") {
    if (typeof output.pageId !== "string" || !output.pageId.trim()) return;
    const id = output.pageId.trim();
    return { id, title: typeof output.title === "string" && output.title.trim() ? output.title.trim() : id, kind: "note", toolCallId };
  }
  if (type !== "tool-readWebPage" || typeof output.url !== "string") return;
  try {
    const parsed = new URL(output.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    return { id: parsed.href, url: parsed.href, title: typeof output.title === "string" && output.title.trim() ? output.title.trim() : parsed.hostname, kind: "web", toolCallId };
  } catch { /* Invalid URLs are not actionable sources. */ }
}
