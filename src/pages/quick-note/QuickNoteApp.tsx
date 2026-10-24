import { useLocale } from "@/i18n";
import { type CSSProperties } from "react";
import { EditorHostBridge } from "@/pages/workspace/components/editor-host/EditorHostBridge";
import { Editor } from "@/components/editor/core/Editor";
import { Toaster } from "@/components/ui/sonner";
import { QuickNoteCollectPreview } from "./QuickNoteCollectPreview";
import { useQuickNoteDraftState } from "./quick-note-app/useQuickNoteDraftState";
import { useQuickNoteEditorActions } from "./quick-note-app/useQuickNoteEditorActions";
import { useQuickNoteSaveActions } from "./quick-note-app/useQuickNoteSaveActions";
import { useQuickNoteShortcuts } from "./quick-note-app/useQuickNoteShortcuts";
import { useQuickNoteWindowPlacement } from "./quick-note-app/useQuickNoteWindowPlacement";
import { renderQuickNoteHeader } from "./quick-note-app/renderQuickNoteHeader";

export function QuickNoteApp() {
  useLocale();
  const draft = useQuickNoteDraftState();
  const editor = useQuickNoteEditorActions(draft);
  const save = useQuickNoteSaveActions(editor);
  const shortcuts = useQuickNoteShortcuts(save);
  const quickNoteWindowPlacementContext =
    useQuickNoteWindowPlacement(shortcuts);
  const context = quickNoteWindowPlacementContext;
  const {
    editorRef,
    collectVariant,
    zoom,
    historyEpoch,
    displaySlot,
    draftPage,
    onDraftChange,
  } = context;

  const headerBar = renderQuickNoteHeader(context);

  return (
    <div
      className="quicknote-root relative flex h-screen w-screen flex-col bg-[hsl(var(--goose-editor-bg))]"
      data-collect-variant={collectVariant ?? undefined}
    >
      {headerBar}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto page-scroll-container">
        <EditorHostBridge
          key={`${displaySlot}-${historyEpoch}`}
          page={draftPage}
          isEditorFullWidth
          contentMode="raw"
          onContentChangeOverride={onDraftChange}
        >
          {
}
          <div
            className="quicknote-editor-surface flex min-h-full flex-col"
            style={{ zoom } as CSSProperties}
          >
            <Editor ref={editorRef} editable showSideMenu={false} />
          </div>
        </EditorHostBridge>
      </div>
      {collectVariant && <QuickNoteCollectPreview variant={collectVariant} />}
      <Toaster
        className="quicknote-toaster"
        placement="center"
        offset={{ bottom: 30, left: 24, right: 24 }}
        mobileOffset={{ bottom: 30, left: 24, right: 24 }}
      />
    </div>
  );
}
