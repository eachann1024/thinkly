import type { BlockNoteEditor } from "@blocknote/core";
import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey } from "prosemirror-state";

import {
  reconcilePageMentionSuggestionMenu,
  reconcileSlashSuggestionMenu,
} from "@/components/editor/utils/slashMenuPolicy";

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
          if (!transactions.some((t) => t.docChanged)) return null;
          // 移动块只改变位置，不是输入引用查询；正文里的 + / @ 不应因此弹菜单。
          if (oldState.selection.$from.parent.eq(newState.selection.$from.parent)) return null;
          queueMicrotask(() => {
            const ed = editorRef.current;
            if (!ed) return;
            // 延迟期间若文档或光标已变化，不能在新的位置补开旧输入的菜单。
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
