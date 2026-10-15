import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { FileText, Link } from "@/components/ui/icons";
import type { SlashMenuItem } from "../core/blocknoteSlashItems";

/** 菜单调用此 helper 即可复用当前编辑器的页面搜索，不依赖全局活动编辑器。 */
export function openPageMentionSearch(editor: BlockNoteEditor<any, any, any>, trigger: "+" | "[[" = "[[") {
  if (!editor.isEditable || editor.prosemirrorView.composing) return;
  const view = editor.prosemirrorView, { selection } = view.state;
  const $from = selection.$from;
  if (!$from.parent.isTextblock || $from.parent.type.spec.code) return;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const slash = /(?:^|\s)[/、][^/、\n]*$/.exec(before);
  const from = slash ? $from.start() + slash.index + (/^\s/.test(slash[0]) ? 1 : 0) : selection.from;
  view.dispatch(view.state.tr.insertText(trigger, from, selection.to));
  editor.getExtension(SuggestionMenu)?.openSuggestionMenu(trigger);
}

export function getPageLinkSlashItems(editor: BlockNoteEditor<any, any, any>): SlashMenuItem[] {
  return [
    { title: "页面", icon: <FileText size={18} />, aliases: ["page", "newpage", "页面", "新建页面"],
      onItemClick: () => openPageMentionSearch(editor, "+") },
    { title: "链接到页面", icon: <Link size={18} />, aliases: ["link", "linktopage", "mention", "页面引用", "双链"],
      onItemClick: () => openPageMentionSearch(editor, "[[") },
  ];
}
