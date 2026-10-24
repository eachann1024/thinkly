import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { createTranslator, i18nYaml } from "@/i18n";
import { isExternalFileTransfer, readExternalDroppedFiles } from "@/lib/external-file-drop";
import {
  captureLocalAssetTarget, discardSavedLocalAsset, isLocalAssetTargetCurrent,
  canAcceptLocalAssetBytes, saveLocalAsset, type SavedLocalAsset,
} from "@/lib/local-file-assets";
import type { EditorRuntime } from "./useEditorSession";

const t = createTranslator(i18nYaml<"src/components/editor/core/useEditorFileDrop.ts#block1:1">`
zh-Hans:
  unavailable: "当前笔记无法插入文件"
  saved: "已插入 {{count}} 个文件"
  skipped: "已跳过 {{count}} 个文件或文件夹"
  changed: "页面或插入位置已变化，请重新拖入"
  failed: "文件插入失败"
en:
  unavailable: "This note cannot accept files"
  saved: "Inserted {{count}} files"
  skipped: "Skipped {{count}} files or folders"
  changed: "The note or insertion point changed. Drop the files again."
  failed: "Could not insert files"
ja:
  unavailable: "このノートにはファイルを挿入できません"
  saved: "{{count}} 件のファイルを挿入しました"
  skipped: "{{count}} 件のファイルまたはフォルダをスキップしました"
  changed: "ノートまたは挿入位置が変更されました。もう一度ドロップしてください"
  failed: "ファイルを挿入できませんでした"
`);

export function useEditorFileDrop(runtime: EditorRuntime, editable: boolean) {
  const { editor, editorContainerRef, pageIdForUpdateRef, inlineAiScopeRef } = runtime;
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const onDrop = (event: DragEvent) => {
      const transfer = event.dataTransfer;
      if (!runtime.pageRef.current?.localFilePath) return;
      if (!transfer || !isExternalFileTransfer(transfer)) return;
      event.preventDefault();
      event.stopPropagation();
      const pageId = pageIdForUpdateRef.current;
      const target = pageId ? captureLocalAssetTarget(pageId) : null;
      if (!editable || !editor.isEditable || !inlineAiScopeRef.current().editable || !target) {
        toast.error(t("unavailable"));
        return;
      }
      const { files, skippedCount } = readExternalDroppedFiles(transfer);
      const element = event.target instanceof Element
        ? event.target.closest<HTMLElement>(".bn-block-outer[data-id], [data-node-type='blockContainer'][data-id]")
        : null;
      const anchorId = element?.dataset.id || editor.document.at(-1)?.id;
      const anchor = anchorId ? editor.getBlock(anchorId) : null;
      if (!anchor) { toast.error(t("changed")); return; }
      const rect = element?.getBoundingClientRect();
      const isTitle = anchor.id === editor.document[0]?.id && anchor.type === "heading";
      const placement = !isTitle && rect && event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      const isCurrent = () => pageIdForUpdateRef.current === pageId && editor.isEditable &&
        inlineAiScopeRef.current().editable && isLocalAssetTargetCurrent(target) && Boolean(editor.getBlock(anchorId!));
      void (async () => {
        const saved: SavedLocalAsset[] = [];
        let skipped = skippedCount;
        let total = 0;
        let committed = false;
        try {
          for (const file of files) {
            if (!isCurrent()) throw new Error(t("changed"));
            if (!canAcceptLocalAssetBytes(file.size, total)) { skipped++; continue; }
            try { saved.push(await saveLocalAsset(file, target)); total += file.size; }
            catch { skipped++; }
          }
          if (!isCurrent()) throw new Error(t("changed"));
          if (!saved.length) {
            toast.error(t("failed"), { description: t("skipped", { count: skipped }) });
            return;
          }
          const blocks = saved.map(asset => ({
            type: asset.kind,
            props: { url: asset.url, name: asset.name, ...(asset.kind === "file" ? {} : { showPreview: true }) },
          }));
          editor.transact(() => editor.insertBlocks(blocks as any, anchorId!, placement));
          committed = true;
          toast.success(t("saved", { count: saved.length }), {
            description: skipped ? t("skipped", { count: skipped }) : undefined,
          });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : t("failed"));
        } finally {
          if (!committed) await Promise.allSettled(saved.map(discardSavedLocalAsset));
        }
      })();
    };
    container.addEventListener("drop", onDrop, true);
    return () => container.removeEventListener("drop", onDrop, true);
  }, [editor, editorContainerRef, editable, pageIdForUpdateRef, inlineAiScopeRef, runtime.pageRef, runtime.activePageId]);
}
