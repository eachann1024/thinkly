import { useMemo } from "react";
import {
  FilePanelController,
  LinkToolbarController,
  SuggestionMenuController,
  type FloatingUIOptions,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  clonePageContent,
  getContentSignature,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { CustomSlashMenu } from "./CustomSlashMenu";
import { EditorFormattingToolbar } from "@/components/editor/toolbars/formatting";
import { FixedFormattingToolbarController } from "@/components/editor/toolbars/formatting/FixedFormattingToolbarController";
import { GooseFormattingToolbarController } from "@/components/editor/toolbars/formatting/GooseFormattingToolbarController";
import { GooseAIMenu } from "@/components/editor/ai/GooseAIMenu";
import { GooseAIMenuController } from "@/components/editor/ai/GooseAIMenuController";
import { FormattingToolbarHoldContext } from "@/components/editor/state/formattingToolbarHold";
import { EditorSideMenu } from "./EditorSideMenu";
import { EditorTrailingAdd } from "./EditorTrailingAdd";
import { ImageLightbox } from "@/components/editor/image/ImageLightbox";
import { EditorLinkToolbar } from "@/components/editor/toolbars/link/EditorLinkToolbar";
import { FindInPageBar } from "@/components/editor/find/FindInPageBar";
import { isQuickNoteEditorPage } from "@/pages/workspace/components/editor-host/editorContentMode";
import { EditorFilePanel } from "@/components/editor/menus/EditorFilePanel";
import { GooseTableHandlesController } from "@/components/editor/menus/GooseTableHandlesController";
import { EditorContextMenu } from "@/components/editor/menus/EditorContextMenu";
import { shouldOpenSlashSuggestionMenu } from "@/components/editor/utils/slashMenuPolicy";
import { PageMentionControllers } from "../inline/PageMentionControllers";
import { getCompactSlashMenuFloatingOptions } from "@/components/editor/utils/compactSlashMenuFloating";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { useEditorComposerInteractions } from "./useEditorComposerInteractions";
import { useEditorComposerToolbar } from "./useEditorComposerToolbar";
import { EditorLinkPopover } from "./EditorLinkPopover";
import type { EditorComposerProps } from "./editorComposerTypes";
import { useEditorDragSource } from "./useEditorDragSource";
import { programmaticRead, tableWindowPaint } from "./programmaticRead";

export {
  normalizeClipboardLineEndings,
  looksLikeMarkdownFragment,
  stripMarkdownHardBreaks,
  normalizeMarkdownPasteText,
  parseMarkdownLink,
  shouldPreferVisibleSelectionText,
  isValidUrl,
} from "@/components/editor/utils/clipboard";

export {
  isBottomEditorBlankClick,
  getSelectedPlainTextContext,
  getSelectedCellPlainText,
  isWholeTableCellSelection,
  getSelectedImageUrl,
  getElementFromNode,
  isInteractiveEditorTarget,
  getActiveGooseNoteEditor,
  getEditorSelectedBlocksForExport,
  readLiveEditorSelectedBlocks,
  rememberEditorSelectedBlocks,
  clearEditorSelectedBlocksCache,
} from "@/components/editor/utils/selection";

export { editorSchema } from "@/components/editor/core/schema";
export function EditorComposer({
  editor,
  editable,
  isActiveEditor,
  page,
  editorContainerRef,
  handleEditorBlankMouseDown,
  handleEditorPasteCapture,
  getSlashItems,
  pageIdForUpdateRef,
  syncedContentSignatureRef,
  pendingEditorChangeRef,
  debouncedUpdate,
  userInteractedRef,
  silentContentSync,
  isEditorFullWidth,
  effectiveTheme,
  searchProviders,
  customActions,
  showSideMenu = true,
  suppressFormattingToolbar = false,
  usesRawEditorContent,
}: EditorComposerProps) {
  useEditorDragSource(editor, page, editorContainerRef);
  const interactions = useEditorComposerInteractions({
    editor,
    editable,
    isActiveEditor,
    page,
    editorContainerRef,
  });
  const {
    aiSettings,
    getMentionItems,
    handleEditorKeyDownCapture,
    find,
    closeFindBar,
  } = interactions;
  const { onPromotePreview } = useEditorPageContext();
  const {
    formattingToolbarOpen,
    formattingToolbarFloatingOptions,
    holdFormattingToolbar,
  } = useEditorComposerToolbar(
    { editor, editable, editorContainerRef, suppressFormattingToolbar },
    interactions.closeLinkPopover,
  );

  const slashMenuFloatingOptions = useMemo(
    () =>
      __GOOSE_EDITOR_COMPACT__
        ? getCompactSlashMenuFloatingOptions()
        : undefined,
    [],
  );
  const linkToolbarFloatingOptions = useMemo<FloatingUIOptions>(
    () => ({
      useHoverProps: {
        delay: { open: 150, close: 0 },
      },
    }),
    [],
  );
  return (
    <EditorContextMenu
      editor={editor}
      editable={editable}
      page={page}
      editorContainerRef={editorContainerRef}
      handleEditorBlankMouseDown={handleEditorBlankMouseDown}
      handleEditorPasteCapture={handleEditorPasteCapture}
      handleEditorKeyDownCapture={handleEditorKeyDownCapture}
      searchProviders={searchProviders}
      customActions={customActions}
      effectiveTheme={effectiveTheme}
      isEditorFullWidth={isEditorFullWidth}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={effectiveTheme}
        slashMenu={false}
        formattingToolbar={false}
        linkToolbar={false}
        sideMenu={false}
        tableHandles={false}
        filePanel={false}
        onChange={() => {
          if (programmaticRead(editor) || tableWindowPaint()) return;
          const safePageId = pageIdForUpdateRef.current;
          if (!safePageId) return;
          const usesRawContent = usesRawEditorContent;
          if (usesRawContent && !userInteractedRef.current) {
            const nextContent = clonePageContent(
              editor.document as BlockNoteContent,
            );
            const nextSig = getContentSignature(nextContent);
            if (nextSig === syncedContentSignatureRef.current) return;
            syncedContentSignatureRef.current = nextSig;
            silentContentSync(nextContent);
            return;
          }
          pendingEditorChangeRef.current = true;
          debouncedUpdate(safePageId);
          if (userInteractedRef.current) {
            onPromotePreview?.();
          }
        }}
      >
        {showSideMenu && editable ? <EditorSideMenu /> : null}
        {showSideMenu && editable ? <EditorTrailingAdd /> : null}
        {editable ? <GooseTableHandlesController /> : null}
        <FormattingToolbarHoldContext.Provider value={holdFormattingToolbar}>
          {__GOOSE_EDITOR_COMPACT__ || isQuickNoteEditorPage(page) ? (
            <FixedFormattingToolbarController
              formattingToolbar={EditorFormattingToolbar}
              open={formattingToolbarOpen}
            />
          ) : (
            <GooseFormattingToolbarController
              formattingToolbar={EditorFormattingToolbar}
              floatingUIOptions={formattingToolbarFloatingOptions}
              portalElement={null}
            />
          )}
        </FormattingToolbarHoldContext.Provider>
        <LinkToolbarController
          linkToolbar={EditorLinkToolbar}
          portalElement={null}
          floatingUIOptions={linkToolbarFloatingOptions}
        />
        {editable ? <FilePanelController filePanel={EditorFilePanel} /> : null}
        {editable ? (
          <>
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={getSlashItems}
              floatingUIOptions={slashMenuFloatingOptions}
              shouldOpen={(event) =>
                shouldOpenSlashSuggestionMenu(event, editor, {
                  allowSlashMenuOnFirstBlock: usesRawEditorContent,
                })
              }
              suggestionMenuComponent={CustomSlashMenu as any}
              onItemClick={(item) => {
                if (item && "onItemClick" in item) {
                  (item as any).onItemClick();
                }
              }}
            />
            <SuggestionMenuController
              triggerCharacter="、"
              getItems={getSlashItems}
              floatingUIOptions={slashMenuFloatingOptions}
              shouldOpen={(event) =>
                shouldOpenSlashSuggestionMenu(event, editor, {
                  allowSlashMenuOnFirstBlock: usesRawEditorContent,
                })
              }
              suggestionMenuComponent={CustomSlashMenu as any}
              onItemClick={(item) => {
                if (item && "onItemClick" in item) {
                  (item as any).onItemClick();
                }
              }}
            />
            {isQuickNoteEditorPage(page) ? null : (
              <PageMentionControllers
                editor={editor}
                getItems={getMentionItems}
                floatingUIOptions={slashMenuFloatingOptions}
              />
            )}
          </>
        ) : null}
        { }
        {__GOOSE_EDITOR_AI__ &&
          aiSettings.enabled &&
          editable &&
          !isQuickNoteEditorPage(page) && (
            <GooseAIMenuController aiMenu={GooseAIMenu} isActiveEditor={isActiveEditor} />
          )}
      </BlockNoteView>
      <EditorLinkPopover {...interactions} />
      <ImageLightbox
        editor={editor}
        editorContainerRef={editorContainerRef}
        editable={editable}
      />
      <FindInPageBar
        editor={editor}
        editorContainerRef={editorContainerRef}
        open={find.phase === "open" || find.phase === "reopening"}
        seedQuery={find.phase === "closed" ? "" : find.request.seed}
        openNonce={find.phase === "closed" ? 0 : find.request.nonce}
        openReplace={find.phase !== "closed" && find.request.replace}
        editable={editable}
        onClose={closeFindBar}
      />
    </EditorContextMenu>
  );
}
