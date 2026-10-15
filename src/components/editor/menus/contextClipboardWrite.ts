import type { EditorView } from "prosemirror-view";
import { getSelectionClipboardPayload } from "../extensions/copyBlockClipboard";

/** 系统不支持富文本写入时显式失败，不把格式化剪切降级成纯文本后删原文。 */
export async function writeContextClipboard(view: EditorView): Promise<void> {
  const payload = getSelectionClipboardPayload(view);
  if (!payload) throw new Error("没有可复制的内容");
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("当前环境不支持富文本剪贴板");
  }
  await navigator.clipboard.write([new ClipboardItem({
    "text/html": new Blob([payload.html], { type: "text/html" }),
    "text/plain": new Blob([payload.plain], { type: "text/plain" }),
  })]);
}
