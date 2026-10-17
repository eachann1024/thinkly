import type { EditorView } from "prosemirror-view";
import { getSelectionClipboardPayload } from "../extensions/copyBlockClipboard";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/menus/contextClipboardWrite.ts#messages:1">`
zh-Hans:
  nothingToCopy: "没有可复制的内容"
  richTextClipboardIsNotSupportedInThis: "当前环境不支持富文本剪贴板"
en:
  nothingToCopy: "Nothing to copy"
  richTextClipboardIsNotSupportedInThis: "Rich text clipboard is not supported in this environment"
ja:
  nothingToCopy: "コピーする内容がありません"
  richTextClipboardIsNotSupportedInThis: "この環境ではリッチテキストのクリップボードに対応していません"
`;
const t = createTranslator(messages);


/** 系统不支持富文本写入时显式失败，不把格式化剪切降级成纯文本后删原文。 */
export async function writeContextClipboard(view: EditorView): Promise<void> {
  const payload = getSelectionClipboardPayload(view);
  if (!payload) throw new Error(t("nothingToCopy"));
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error(t("richTextClipboardIsNotSupportedInThis"));
  }
  await navigator.clipboard.write([new ClipboardItem({
    "text/html": new Blob([payload.html], { type: "text/html" }),
    "text/plain": new Blob([payload.plain], { type: "text/plain" }),
  })]);
}
