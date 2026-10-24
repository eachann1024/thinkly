import type { BlockNoteEditor } from "@blocknote/core";
import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey } from "prosemirror-state";

import {
  reconcilePageMentionSuggestionMenu,
  reconcileSlashSuggestionMenu,
} from "@/components/editor/utils/slashMenuPolicy";

import { isSuggestionReconcileSuppressed, shouldReconcileSuggestionInput } from "../utils/suggestionInputPolicy";

const PLUGIN_KEY = new PluginKey("goose-slash-menu-reconcile");

export function createGooseSlashMenuReconcileExtension(
  allowSlashMenuOnFirstBlockRef: { current: boolean },
  editorRef: { current: BlockNoteEditor<any, any, any> | null },
) {
  return createExtension({
    key: "goose-slash-menu-reconcile",
    prosemirrorPlugins: [
      new Plugin({
        key: PLUGIN_KEY,
        appendTransaction(transactions, oldState, newState) {
          if (editorRef.current && isSuggestionReconcileSuppressed(editorRef.current)) return null;
          if (!shouldReconcileSuggestionInput(transactions, oldState, newState)) return null;
          if (oldState.selection.$from.parent.eq(newState.selection.$from.parent)) return null;
          queueMicrotask(() => {
            const ed = editorRef.current;
            if (!ed) return;
            const current = ed.prosemirrorState;
            if (current.doc !== newState.doc || !current.selection.eq(newState.selection)) return;
            reconcileSlashSuggestionMenu(ed, {
              allowSlashMenuOnFirstBlock: allowSlashMenuOnFirstBlockRef.current,
            });
            reconcilePageMentionSuggestionMenu(ed);
          });
          return null;
        },
      }),
    ],
  });
}
