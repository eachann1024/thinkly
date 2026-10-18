import "../file-drop.css";
import { createTranslator, i18nYaml, useLocale } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/hooks/useFileDrop.ts#localMessages:1">`
zh-Hans:
  textFileImported: "文本文件已导入"
  filesImported: "已导入 {{count}} 个文件"
  folderOpened: "文件夹已打开"
  thisFileFormatIsnTSupportedYet: "暂不支持此文件格式"
  dropAPlainTextFileInMd: "侧边栏仅支持 .md、.markdown；其他文件请拖入编辑器。"
  connectALocalFolderFirst: "请先关联本地文件夹"
  openOrConnectALocalFolderIn: "导入前请先在左侧栏打开或关联一个本地文件夹。"
  couldnTImportThisFile: "无法导入该文件"
  theFileMayBeDamagedOrUse: "文件内容可能损坏或编码异常，无法解析为笔记。"
  filesSkipped: "仅支持 Markdown，已跳过 {{count}} 个文件或文件夹"
  importFailed: "导入失败"
  couldnTLoadTheImporterTryAgain: "导入模块加载失败，请重试。"
  theFileCouldnTBeReadAs: "文件内容无法解析为笔记。"
en:
  textFileImported: "Text file imported"
  filesImported: "Files imported: {{count}}"
  folderOpened: "Folder opened"
  thisFileFormatIsnTSupportedYet: "This file format isn’t supported yet"
  dropAPlainTextFileInMd: "The sidebar accepts .md and .markdown only. Drop other files into the editor."
  connectALocalFolderFirst: "Connect a local folder first"
  openOrConnectALocalFolderIn: "Open or connect a local folder in the sidebar before importing."
  couldnTImportThisFile: "Couldn’t import this file"
  theFileMayBeDamagedOrUse: "The file may be damaged or use an unsupported encoding, so it couldn’t be read as a note."
  filesSkipped: "Markdown only. Skipped {{count}} files or folders."
  importFailed: "Import failed"
  couldnTLoadTheImporterTryAgain: "Couldn’t load the importer. Try again."
  theFileCouldnTBeReadAs: "The file couldn’t be read as a note."
ja:
  textFileImported: "テキストファイルを読み込みました"
  filesImported: "{{count}} 件のファイルを読み込みました"
  folderOpened: "フォルダを開きました"
  thisFileFormatIsnTSupportedYet: "このファイル形式にはまだ対応していません"
  dropAPlainTextFileInMd: "サイドバーは .md、.markdown のみ対応。他のファイルはエディターにドロップしてください。"
  connectALocalFolderFirst: "先にローカルフォルダを関連付けてください"
  openOrConnectALocalFolderIn: "読み込む前に、左のサイドバーでローカルフォルダを開くか関連付けてください。"
  couldnTImportThisFile: "このファイルを読み込めません"
  theFileMayBeDamagedOrUse: "ファイルが破損しているか、文字コードが不正なため、ノートとして解析できません。"
  filesSkipped: "Markdown のみ対応。{{count}} 件のファイルまたはフォルダをスキップしました"
  importFailed: "読み込みに失敗しました"
  couldnTLoadTheImporterTryAgain: "インポート機能を読み込めませんでした。もう一度お試しください。"
  theFileCouldnTBeReadAs: "ファイルの内容をノートとして解析できません。"
`;
const uiText = createTranslator(localMessages);
import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useTabs } from "@/stores/useTabs";
import { activateNotebook } from "@/lib/notebookNavigation";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { clearLocalFolderFileDropTarget } from "@/lib/local-folder-file-drop-target";
import { importFilesToLocalFolder, isSupportedTextImportFile, resolveImportParentForDrop } from "@/lib/local-folder-import";
import { getExternalFileDropTarget, isExternalFileTransfer, readExternalDroppedFiles, getSidebarFileDragState } from "@/lib/external-file-drop";

type WorkspaceDragIntent = "editor" | "sidebar" | "rejected" | "pending" | "file";

export function useFileDrop() {
  useLocale();
  const [isDragging, setIsDragging] = useState(false);
  const [dragIntent, setDragIntent] = useState<WorkspaceDragIntent>("file");
  const dragCounter = useRef(0);
  const reset = () => {
    setIsDragging(false);
    dragCounter.current = 0;
    clearLocalFolderFileDropTarget();
  };
  useEffect(() => {
    // Capture also sees editor drops stopped before React's workspace handler.
    const onDrop = () => queueMicrotask(reset);
    window.addEventListener("drop", onDrop, true);
    window.addEventListener("dragend", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("drop", onDrop, true);
      window.removeEventListener("dragend", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);
  const showTarget = (e: React.DragEvent) => {
    const target = getExternalFileDropTarget(e.target);
    if (!(e.target instanceof Element) || !e.target.closest(".main-tree-row")) clearLocalFolderFileDropTarget();
    const acceptance = target === "sidebar" ? getSidebarFileDragState(e.dataTransfer) : "accepted";
    const rejected = acceptance === "rejected";
    setDragIntent(rejected ? "rejected" : acceptance === "pending" ? "pending" : target || "file");
    setIsDragging(Boolean(target));
    e.dataTransfer.dropEffect = target && !rejected ? "copy" : "none";
  };
  const handleDragEnter = (e: React.DragEvent) => {
    if (!isExternalFileTransfer(e.dataTransfer)) return;
    e.preventDefault();
    dragCounter.current++;
    showTarget(e);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!isExternalFileTransfer(e.dataTransfer)) return;
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (!dragCounter.current) reset();
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!isExternalFileTransfer(e.dataTransfer)) return;
    e.preventDefault();
    showTarget(e);
  };
  const handleDrop = async (e: React.DragEvent) => {
    if (!isExternalFileTransfer(e.dataTransfer)) return;
    e.preventDefault();
    const destination = getExternalFileDropTarget(e.target);
    const workspaceId = useNotebooks.getState().activeNotebookId;
    const parentId = workspaceId ? resolveImportParentForDrop(workspaceId) : undefined;
    const dropped = readExternalDroppedFiles(e.dataTransfer);
    const files = dropped.files.filter(isSupportedTextImportFile);
    const skippedCount = dropped.skippedCount + dropped.files.length - files.length;
    reset();
    if (destination !== "sidebar") return;
    const notebook = workspaceId ? useNotebooks.getState().notebooks[workspaceId] : null;
    if (!workspaceId || notebook?.source !== "local-folder") {
      toast.error(uiText("connectALocalFolderFirst"));
      return;
    }
    if (!files.length) {
      toast.error(uiText("thisFileFormatIsnTSupportedYet"), { description: uiText("dropAPlainTextFileInMd") });
      return;
    }
    const { importedIds, failedCount } = await importFilesToLocalFolder({ workspaceId, files, parentId });
    if (!importedIds.length) {
      toast.error(uiText("couldnTImportThisFile"), {
        description: uiText("filesSkipped", { count: failedCount + skippedCount }),
      });
      return;
    }
    // Opening an import must not pull the user back after a notebook switch.
    if (useNotebooks.getState().activeNotebookId === workspaceId) {
      closeNotebookAiIfFullscreen();
      await activateNotebook(workspaceId);
      useTabs.getState().openTab(importedIds[0]);
      await usePages.getState().setActivePage(importedIds[0]);
    }
    toast.success(uiText("filesImported", { count: importedIds.length }), {
      description: failedCount + skippedCount ? uiText("filesSkipped", { count: failedCount + skippedCount }) : undefined,
    });
  };
  return { isDragging, dragIntent, handleDragEnter, handleDragLeave, handleDragOver, handleDrop };
}
