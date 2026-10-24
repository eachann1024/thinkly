import { useMemo, type ReactNode } from "react";
import type { Page } from "@/types";
import { EditorHostProvider, type EditorPageContext, type EditorSettings } from "@/components/editor/platform/hostContext";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { useSearchSession } from "../sidebar/useSearchSession";

function hostPage(notebookId: string): Page {
  const now = Date.now();
  return {
    id: `__search-composer__${notebookId}`,
    workspaceId: notebookId,
    content: { type: "doc", content: [] },
    isLocked: false,
    fontSize: "default",
    fontFamily: "default",
    createdAt: now,
    updatedAt: now,
  };
}

export function SearchComposerHost({ notebookId, onOpenResult, children }: {
  notebookId: string | null;
  onOpenResult?: (page: { id: string; localFilePath?: string }) => void;
  children: ReactNode;
}) {
  const theme = useSettings(s => s.theme);
  const editorFontSize = useSettings(s => s.editorFontSize);
  const customFonts = useSettings(s => s.customFonts);
  const defaultCodeBlockWrap = useSettings(s => s.defaultCodeBlockWrap);
  const setDefaultCodeBlockWrap = useSettings(s => s.setDefaultCodeBlockWrap);
  const ai = useSettings(s => s.ai);
  const searchProviders = useSettings(s => s.searchProviders);
  const customActions = useSettings(s => s.customActions);
  const page = useMemo(() => hostPage(notebookId ?? "search"), [notebookId]);
  const settings = useMemo<EditorSettings>(() => ({
    theme, editorFontSize, customFonts, defaultCodeBlockWrap,
    onDefaultCodeBlockWrapChange: setDefaultCodeBlockWrap,
    ai, searchProviders, customActions, useInternalImageViewer: true,
    features: { tablePresentationControls: false, mermaidUnsafeHTML: false, transcodeVideoUploads: false, openAttachmentsExternally: true },
  }), [theme, editorFontSize, customFonts, defaultCodeBlockWrap, setDefaultCodeBlockWrap, ai, searchProviders, customActions]);
  const pageContext = useMemo<EditorPageContext>(() => ({
    page,
    contentMode: "normalized",
    isEditorFullWidth: true,
    onContentChange: () => {},
    onOpenPage: (pageId) => {
      const target = usePages.getState().pages[pageId];
      if (onOpenResult) onOpenResult({ id: pageId, ...(target?.localFilePath ? { localFilePath: target.localFilePath } : {}) });
      else useSearchSession.getState().targetPage(pageId, true);
      return true;
    },
    getActivePageLocalFilePath: () => null,
    getActivePageLocalFolderRoot: () => useNotebooks.getState().notebooks[page.workspaceId]?.source === "local-folder"
      ? useNotebooks.getState().notebooks[page.workspaceId]?.localPath ?? null
      : null,
    searchPages: () => [],
    resolvePageContexts: () => [],
  }), [onOpenResult, page]);
  return <EditorHostProvider settings={settings} pageContext={pageContext}>{children}</EditorHostProvider>;
}
