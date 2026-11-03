import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n/core";
import type { AuxiliaryKind } from "@/lib/auxiliary-window/contract";
import { useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";

const text = createTranslator(i18nYaml<"src/windows/views/PlaceholderWindow.tsx#block1:1">`
zh-Hans:
  pending: "这个窗口还没有内容。"
  reflection: "反思"
  recovery-drafts: "恢复稿"
  app-update: "更新"
  ai-setup: "配置 AI 写作助手"
  fullscreen-preview: "预览"
  notebook-edit: "编辑笔记本"
  confirm: "确认"
  selection-quote: "选区引用"
en:
  pending: "This window has no content yet."
  reflection: "Reflection"
  recovery-drafts: "Recovery drafts"
  app-update: "Update"
  ai-setup: "Set up AI writing"
  fullscreen-preview: "Preview"
  notebook-edit: "Edit notebook"
  confirm: "Confirm"
  selection-quote: "Selection quote"
ja:
  pending: "このウィンドウにはまだ内容がありません。"
  reflection: "振り返り"
  recovery-drafts: "復元データ"
  app-update: "アップデート"
  ai-setup: "AI 執筆の設定"
  fullscreen-preview: "プレビュー"
  notebook-edit: "ノートブックを編集"
  confirm: "確認"
  selection-quote: "選択範囲の引用"
`);

export function PlaceholderWindow({ kind }: { kind: AuxiliaryKind }) {
  useLocale();
  const state = useAuxiliaryWindow();
  return (
    <StandaloneWindowShell title={text(kind)} maximizable={state.resizable}>
      <p className="p-6 text-sm text-muted-foreground">{text("pending")}</p>
    </StandaloneWindowShell>
  );
}
