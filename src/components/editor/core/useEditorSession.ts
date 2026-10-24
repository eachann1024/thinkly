import { useCallback, useEffect, useRef, useState } from "react";
import type { useCreateBlockNote } from "@blocknote/react";
import {
  useEditorSettings,
  useEditorPageContext,
} from "@/components/editor/platform/hostContext";
import { useEditorPlatform } from "@/components/editor/platform/context";
import {
  normalizePageContent,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { markUserInteraction } from "@/lib/editor-interaction-signal";
import { rememberEditorSelectedBlocks } from "@/components/editor/utils/selection";
import { toEditorBlocks } from "./editorContentPolicy";

export function useEditorSession(editable: boolean) {
  const settings = useEditorSettings();
  const {
    theme,
    searchProviders,
    customActions,
    ai: aiSettings,
  } = settings;
  const {
    page,
    contentMode,
    isEditorFullWidth,
    onContentChange,
    onOpenPage,
    getActivePageLocalFilePath,
    getActivePageLocalFolderRoot,
    onOpenMarkdownPath,
    onOpenAttachment,
    getLatestPage,
  } = useEditorPageContext();
  const platform = useEditorPlatform();
  const activePageId = page?.id ?? null;

  const pageIdForUpdateRef = useRef<string | null>(null);
  const syncedContentSignatureRef = useRef<string | null>(null);
  const pendingEditorChangeRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const shiftPressedRef = useRef(false);
  pageIdForUpdateRef.current = page?.id ?? null;

  const [suppressFormattingToolbar, setSuppressFormattingToolbar] =
    useState(false);
  const suppressFormattingToolbarRef = useRef(false);

  const aiSettingsRef = useRef(aiSettings);
  aiSettingsRef.current = aiSettings;
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;
  const onOpenPageRef = useRef(onOpenPage);
  onOpenPageRef.current = onOpenPage;
  const getActivePageLocalFilePathRef = useRef(getActivePageLocalFilePath);
  getActivePageLocalFilePathRef.current = getActivePageLocalFilePath;
  const getActivePageLocalFolderRootRef = useRef(getActivePageLocalFolderRoot);
  getActivePageLocalFolderRootRef.current = getActivePageLocalFolderRoot;
  const onOpenMarkdownPathRef = useRef(onOpenMarkdownPath);
  onOpenMarkdownPathRef.current = onOpenMarkdownPath;
  const onOpenAttachmentRef = useRef(onOpenAttachment);
  onOpenAttachmentRef.current = onOpenAttachment;
  const pageRef = useRef(page);
  pageRef.current = page;
  const contentModeRef = useRef(contentMode);
  contentModeRef.current = contentMode;
  const inlineAiScopeRef = useRef(() => ({
    pageId: "",
    editable: false,
    protectFirstTitle: true,
  }));
  inlineAiScopeRef.current = () => {
    const latest = getLatestPage ? getLatestPage(page.id) : page;
    return {
      pageId: page.id,
      editable: Boolean(
        latest &&
        editable &&
        !latest.isLocked &&
        !latest.trashedAt &&
        !(latest.localFilePath && latest.localReadState === "error"),
      ),
      protectFirstTitle: contentMode === "normalized",
    };
  };
  const platformRef = useRef(platform);
  platformRef.current = platform;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const editorInstanceRef = useRef<ReturnType<
    typeof useCreateBlockNote
  > | null>(null);

  const usesRawEditorContent = contentMode === "raw";
  const usesRawEditorContentRef = useRef(usesRawEditorContent);
  usesRawEditorContentRef.current = usesRawEditorContent;
  const normalizeContent = (c: unknown): BlockNoteContent =>
    usesRawEditorContent
      ? toEditorBlocks(c)
      : normalizePageContent(c as Parameters<typeof normalizePageContent>[0]);

  const userInteractedRef = useRef(false);
  useEffect(() => {
    const markInteracted = (event: Event) => {
      userInteractedRef.current = true;
      markUserInteraction();
      const currentEditor = editorInstanceRef.current;
      if (!currentEditor || event.type !== "pointerdown") return;
      const target = event.target;
      const insideEditor =
        target instanceof Node &&
        Boolean(currentEditor.domElement?.contains(target));
      if (insideEditor) return;
      rememberEditorSelectedBlocks(currentEditor);
    };
    const events = ["pointerdown", "keydown", "paste", "cut", "drop"] as const;
    events.forEach((name) =>
      document.addEventListener(name, markInteracted, true),
    );
    return () =>
      events.forEach((name) =>
        document.removeEventListener(name, markInteracted, true),
      );
  }, []);

  const silentContentSync = useCallback((content: BlockNoteContent) => {
    onContentChangeRef.current(content, { silent: true });
  }, []);

  return {
    settings,
    theme,
    searchProviders,
    customActions,
    aiSettings,
    page,
    contentMode,
    isEditorFullWidth,
    onContentChange,
    onOpenPage,
    getActivePageLocalFilePath,
    getActivePageLocalFolderRoot,
    onOpenMarkdownPath,
    onOpenAttachment,
    getLatestPage,
    platform,
    activePageId,
    pageIdForUpdateRef,
    syncedContentSignatureRef,
    pendingEditorChangeRef,
    editorContainerRef,
    shiftPressedRef,
    suppressFormattingToolbar,
    setSuppressFormattingToolbar,
    suppressFormattingToolbarRef,
    aiSettingsRef,
    onContentChangeRef,
    onOpenPageRef,
    getActivePageLocalFilePathRef,
    getActivePageLocalFolderRootRef,
    onOpenMarkdownPathRef,
    onOpenAttachmentRef,
    pageRef,
    contentModeRef,
    inlineAiScopeRef,
    platformRef,
    settingsRef,
    editorInstanceRef,
    usesRawEditorContent,
    usesRawEditorContentRef,
    normalizeContent,
    userInteractedRef,
    silentContentSync,
  };
}

export type EditorSession = ReturnType<typeof useEditorSession>;
export type EditorRuntime = EditorSession & {
  editor: ReturnType<typeof useCreateBlockNote>;
};
