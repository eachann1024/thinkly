import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/page-menu/usePageMenu.ts#localMessages:1">`
zh-Hans:
  noFile: "未选择文件"
  importFailed: "导入失败"
  needFolder: "请先关联本地文件夹"
  chooseImportFolder: "导入前请先在左侧栏打开或新建一个本地文件夹作为存储位置。"
  retryImport: "导入失败，请重试"
  imported: "已导入为新笔记"
  checkImportFile: "导入失败，请检查文件后重试"
  exportSingleNote: "暂不支持整夹导出，请打开具体笔记后再执行导出"
  exporting: "正在导出 {{format}}…"
  exported: "{{format}} 已导出"
  exportError: "{{format}} 导出失败：{{error}}"
  exportFailed: "{{format}} 导出失败"
  selection: "选中内容"
en:
  noFile: "No file selected"
  importFailed: "Import failed"
  needFolder: "Connect a local folder first"
  chooseImportFolder: "Open or create a local folder in the sidebar before importing."
  retryImport: "Import failed. Try again."
  imported: "Imported as a new note"
  checkImportFile: "Import failed. Check the file and try again."
  exportSingleNote: "Folder export isn’t supported yet. Open a note to export it."
  exporting: "Exporting {{format}}…"
  exported: "{{format}} exported"
  exportError: "Couldn’t export {{format}}: {{error}}"
  exportFailed: "Couldn’t export {{format}}"
  selection: "Selected content"
ja:
  noFile: "ファイルが選択されていません"
  importFailed: "インポートに失敗しました"
  needFolder: "先にローカルフォルダを関連付けてください"
  chooseImportFolder: "インポートする前に、サイドバーで保存先となるローカルフォルダを開くか新規作成してください。"
  retryImport: "インポートに失敗しました。もう一度お試しください"
  imported: "新しいノートとしてインポートしました"
  checkImportFile: "インポートに失敗しました。ファイルを確認してからもう一度お試しください"
  exportSingleNote: "フォルダ単位の書き出しにはまだ対応していません。ノートを開いてから書き出してください"
  exporting: "{{format}} を書き出し中…"
  exported: "{{format}} を書き出しました"
  exportError: "{{format}} を書き出せませんでした：{{error}}"
  exportFailed: "{{format}} を書き出せませんでした"
  selection: "選択した内容"
`;
const uiText = createTranslator(localMessages);
import { useSettings } from "@/stores/useSettings";
import { useEffect, useRef, useState } from "react";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import type { CardThemeId, WatermarkConfig } from "@/lib/imageExport";
import { exportPageToImage, exportSelectionToImage } from "@/lib/imageExport";
import { extractBlockNoteTitle } from "@/components/editor/utils/blocknote-content";
import { getActiveGooseNoteEditor, getEditorSelectedBlocksForExport } from "@/components/editor/utils/selection";
import { toast } from "@/components/ui/sonner";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { useTabs } from "@/stores/useTabs";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { DEFAULT_NOTEBOOK } from "@/stores/notebooks/types";
import { importFile } from "@/lib/export";

function captureEditorSelectedBlocks(): BlockNoteContent {
  return getEditorSelectedBlocksForExport(getActiveGooseNoteEditor());
}

export function usePageMenu() {
  useLocale();
  const defaultLayout = useSettings(state => state.defaultPageLayout);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  }));
  const {
    activePageId,
    getPage,
    updatePage,
    createPage,
    createLocalPageRecord,
    setActivePage,
  } = usePages();
  const { activeNotebookId, notebooks } = useNotebooks();
  const page = activePageId ? getPage(activePageId) : undefined;
  const activeNotebook = activeNotebookId
    ? notebooks[activeNotebookId]
    : undefined;
  const isLocalFolderNotebook = activeNotebook?.source === "local-folder";
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<BlockNoteContent>([]);
  const selectedBlocksRef = useRef<BlockNoteContent>([]);
  const importPending = useRef(false);
  const exportPending = useRef(false);
  const isLocalItem = Boolean(page?.localFilePath);
  const { openTabs, activeTabId } = useTabs();
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);
  const canOpenInNewWindow = isElectronRuntime();

  const captureSelectedBlocks = () => {
    const blocks = captureEditorSelectedBlocks();
    selectedBlocksRef.current = blocks;
    setSelectedBlocks(blocks);
    return blocks;
  };

  useEffect(() => {
    const updateViewport = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const handleImport = async () => {
    if (importPending.current) return;
    importPending.current = true;
    try {
      const result = await importFile({
        preserveStructure: isLocalFolderNotebook,
      });
      if (!result.success) {
        if (result.error !== uiText("noFile")) {
          toast.error(result.error || uiText("importFailed"));
        }
        return;
      }

      closeNotebookAiIfFullscreen();
      if (!activeNotebookId) {
        toast.error(uiText("needFolder"), {
          description: uiText("chooseImportFolder"),
        });
        return;
      }

      if (isLocalFolderNotebook && activeNotebookId) {
        const pageId = await createLocalPageRecord({
          workspaceId: activeNotebookId,
          title: result.title,
          content: result.content as never,
        });
        if (!pageId) {
          toast.error(uiText("retryImport"));
          return;
        }
        setActivePage(null);
        requestAnimationFrame(() => {
          setActivePage(pageId);
        });
        toast.success(uiText("imported"));
        return;
      }

      const newId = createPage(undefined, activeNotebookId || DEFAULT_NOTEBOOK);
      if (!newId) return;

      const content = result.content;
      const blocks = [
        { type: "heading", props: { level: 1 }, content: result.title },
        ...content,
      ] as any[];

      updatePage(newId, { content: blocks });

      setActivePage(null);
      requestAnimationFrame(() => {
        setActivePage(newId);
      });
      toast.success(uiText("imported"));
    } catch (error) {
      console.error("导入失败:", error);
      toast.error(uiText("checkImportFile"));
    } finally {
      importPending.current = false;
    }
  };

  const runExport = (label: string, task: () => Promise<boolean>) => {
    if (exportPending.current) return;
    if (page?.isFolder) {
      toast.error(uiText("exportSingleNote"));
      return;
    }
    exportPending.current = true;
    const toastId = toast.loading(uiText("exporting", {format: label}));
    void Promise.resolve().then(task)
      .then((saved) => {
        if (saved) toast.success(uiText("exported", {format: label}), { id: toastId });
        else toast.dismiss(toastId);
      })
      .catch((error) => {
        console.error(`[export] ${label} 失败:`, error);
        const message = error instanceof Error ? error.message : "";
        toast.error(
          message ? uiText("exportError", {format: label, error: message}) : uiText("exportFailed", {format: label}),
          { id: toastId },
        );
      })
      .finally(() => { exportPending.current = false; });
  };

  const handleThemeConfirm = (
    themeId: CardThemeId,
    watermarkConfig: WatermarkConfig,
  ) => {
    if (!page) return;
    const blocks = selectedBlocksRef.current;
    if (blocks.length > 0) {
      exportSelectionToImage(
        blocks,
        extractBlockNoteTitle(page.content) || uiText("selection"),
        themeId,
        watermarkConfig,
        page,
      );
    } else {
      exportPageToImage(page, themeId, watermarkConfig);
    }
  };

  return {
    page, activePageId, viewport,
    defaultLayout, themeSelectorOpen, setThemeSelectorOpen,
    pageMenuOpen, setPageMenuOpen, selectedBlocks,
    isLocalItem, activeTab, canOpenInNewWindow,
    captureSelectedBlocks, handleImport, runExport,
    handleThemeConfirm, updatePage,
  };
}
