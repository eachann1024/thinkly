import { FileText } from "@/components/ui/icons";
import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { Fragment } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import type { AiReferenceSuggestionItem } from "@/components/editor/ai/composer/referenceLookup";
import type { SlashMenuItem } from "@/components/editor/core/blocknoteSlashItems";
import { PAGE_MENTION_TYPE, wikiTargetFromReference } from "./pageMention";
import { mentionTriggerDeleteRange } from "@/components/editor/utils/slashMenuPolicy";
import { PAGE_MENTION_TRIGGERS } from "../utils/pageMentionQuery";

type MentionRange = { from: number; to: number };

/** 活动菜单的 query 可能包含 + / @；替换实际触发范围，不能重新猜最后一个符号。 */
export function getPageMentionTriggerRange(editor: BlockNoteEditor<any, any, any>): MentionRange | null {
  const { selection } = editor.prosemirrorState;
  if (!selection.empty || !selection.$from.parent.isTextblock) return null;
  const $from = selection.$from;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const menu = editor.getExtension(SuggestionMenu)?.store.state;
  if (menu && PAGE_MENTION_TRIGGERS.some((trigger) => trigger === menu.triggerCharacter)) {
    const suffix = menu.triggerCharacter + menu.query;
    if (textBefore.endsWith(suffix)) return { from: selection.from - suffix.length, to: selection.from };
  }
  return mentionTriggerDeleteRange($from.start(), textBefore, selection.from);
}

export function insertPageMentionFromMenu(
  editor: BlockNoteEditor<any, any, any>,
  item: AiReferenceSuggestionItem,
  originalRange?: MentionRange | null,
) {
  const title = item.titleSnapshot || item.title;
  const props = {
    pageId: item.pageId,
    workspaceId: item.workspaceId,
    title,
    notebookName: item.notebookNameSnapshot ?? "",
    wikiTarget: wikiTargetFromReference(item) || title,
  };

  const view = editor.prosemirrorView;
  const mentionType = view?.state.schema.nodes[PAGE_MENTION_TYPE];
  if (view && mentionType) {
    const { selection } = view.state;
    if (selection.empty) {
      const range = originalRange ?? getPageMentionTriggerRange(editor);
      if (range) {
        const mentionNode = mentionType.create(props);
        const nodes = [mentionNode];
        const space = view.state.schema.text(" ");
        if (space) nodes.push(space);
        const tr = view.state.tr.replaceWith(range.from, range.to, Fragment.from(nodes));
        const caret = range.from + nodes.reduce((size, node) => size + node.nodeSize, 0);
        view.dispatch(tr.setSelection(TextSelection.create(tr.doc, caret)).scrollIntoView());
        editor.getExtension(SuggestionMenu)?.closeMenu();
        editor.focus();
        return;
      }
    }
  }

  editor.insertInlineContent([
    {
      type: PAGE_MENTION_TYPE,
      props,
    },
    " ",
  ]);
  editor.getExtension(SuggestionMenu)?.closeMenu();
  editor.focus();
}

export function getPageMentionMenuItems(
  editor: BlockNoteEditor<any, any, any>,
  items: AiReferenceSuggestionItem[],
): SlashMenuItem[] {
  if (items.length === 0) {
    return [
      {
        title: "未找到匹配笔记",
        disabled: true,
        disabledReason: "换个关键词试试",
        onItemClick: () => {},
      },
    ];
  }

  return items.map((item) => ({
    title: item.title,
    description: item.description,
    icon: <FileText size={18} />,
    onItemClick: () => insertPageMentionFromMenu(editor, item),
  }));
}
