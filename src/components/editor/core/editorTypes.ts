import type { useCreateBlockNote } from "@blocknote/react";
export interface EditorRef {
  editor: ReturnType<typeof useCreateBlockNote> | null;
}

export interface EditorProps {
  editable?: boolean;
  isActiveEditor?: boolean;
  spellCheck?: boolean;
  hiddenSlashItemTitles?: string[];
  showSideMenu?: boolean;
}
