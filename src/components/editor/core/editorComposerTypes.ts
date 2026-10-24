import type { RefObject } from "react";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
export type EditorComposerProps = {
  editor: any;
  editable: boolean;
  isActiveEditor: boolean;
  page: any;
  editorContainerRef: RefObject<HTMLDivElement | null>;
  handleEditorBlankMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleEditorPasteCapture: (
    event: React.ClipboardEvent<HTMLDivElement>,
  ) => void;
  getSlashItems: (query: string) => Promise<any[]>;
  pageIdForUpdateRef: RefObject<string | null>;
  syncedContentSignatureRef: RefObject<string | null>;
  pendingEditorChangeRef: RefObject<boolean>;
  debouncedUpdate: ((id: string) => void) & { cancel: () => void };
  userInteractedRef: RefObject<boolean>;
  silentContentSync: (content: BlockNoteContent) => void;
  isEditorFullWidth: boolean;
  effectiveTheme: "light" | "dark";
  searchProviders: any[];
  customActions: any[];
  showSideMenu?: boolean;
  suppressFormattingToolbar?: boolean;
  usesRawEditorContent: boolean;
};
