import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { FileText, Link } from "@/components/ui/icons";
import type { SlashMenuItem } from "../core/blocknoteSlashItems";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/inline/pageLinkSlashItems.tsx#messages:1">`
zh-Hans:
  page: "页面"
  linkToPage: "链接到页面"
en:
  page: "Page"
  linkToPage: "Link to page"
ja:
  page: "ページ"
  linkToPage: "ページへのリンク"
`;
const t = createTranslator(messages);


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
    { get title() { return t("page"); }, icon: <FileText size={18} />, aliases: ["page", "newpage", "页面", "新建页面"],
      onItemClick: () => openPageMentionSearch(editor, "+") },
    { get title() { return t("linkToPage"); }, icon: <Link size={18} />, aliases: ["link", "linktopage", "mention", "页面引用", "双链"],
      onItemClick: () => openPageMentionSearch(editor, "[[") },
  ];
}
