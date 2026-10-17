import type { BlockNoteEditor } from "@blocknote/core";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { TEXT_COLORS, HIGHLIGHT_COLORS } from "../toolbars/formatting/colorPalette";
import type { SlashMenuItem } from "./blocknoteSlashModel";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/core/blocknoteCommandSlashItems.ts#messages:1">`
zh-Hans:
  text: "文本"
  heading1: "一级标题"
  heading2: "二级标题"
  heading3: "三级标题"
  checklist: "待办事项"
  bulletedList: "无序列表"
  numberedList: "有序列表"
  toggleList: "折叠列表"
  toggleHeading1: "折叠一级标题"
  toggleHeading2: "折叠二级标题"
  toggleHeading3: "折叠三级标题"
  quote: "引用"
  callout: "标注"
  codeBlock: "代码块"
  turnIntoBlock: "转换为{{label}}"
en:
  text: "Text"
  heading1: "Heading 1"
  heading2: "Heading 2"
  heading3: "Heading 3"
  checklist: "Checklist"
  bulletedList: "Bulleted list"
  numberedList: "Numbered list"
  toggleList: "Toggle list"
  toggleHeading1: "Toggle heading 1"
  toggleHeading2: "Toggle heading 2"
  toggleHeading3: "Toggle heading 3"
  quote: "Quote"
  callout: "Callout"
  codeBlock: "Code block"
  turnIntoBlock: "Turn into {{label}}"
`;
const t = createTranslator(messages);


const BLOCK_CONVERSIONS = [
  { get label() { return t("text"); }, type: "paragraph" },
  { get label() { return t("heading1"); }, type: "heading", props: { level: 1, isToggleable: false, collapsed: false } },
  { get label() { return t("heading2"); }, type: "heading", props: { level: 2, isToggleable: false, collapsed: false } },
  { get label() { return t("heading3"); }, type: "heading", props: { level: 3, isToggleable: false, collapsed: false } },
  { get label() { return t("checklist"); }, type: "checkListItem" },
  { get label() { return t("bulletedList"); }, type: "bulletListItem" },
  { get label() { return t("numberedList"); }, type: "numberedListItem" },
  { get label() { return t("toggleList"); }, type: "toggleListItem", props: { collapsed: false } },
  { get label() { return t("toggleHeading1"); }, type: "heading", props: { level: 1, isToggleable: true, collapsed: false } },
  { get label() { return t("toggleHeading2"); }, type: "heading", props: { level: 2, isToggleable: true, collapsed: false } },
  { get label() { return t("toggleHeading3"); }, type: "heading", props: { level: 3, isToggleable: true, collapsed: false } },
  { get label() { return t("quote"); }, type: "quote" },
  { get label() { return t("callout"); }, type: "callout" },
  { get label() { return t("codeBlock"); }, type: "codeBlock", props: { language: "text" } },
] as const;

const aliases: Record<string, string> = {
  paragraph: "text paragraph 文本", heading: "heading title 标题", checkListItem: "todo task 待办",
  bulletListItem: "bullet list 无序列表", numberedListItem: "number ordered 有序列表",
  toggleListItem: "toggle 折叠列表", quote: "quote 引用", callout: "callout 标注",
  codeBlock: "code 代码块",
};

/** Commands change the current block after the suggestion controller removes its query. */
export function getCommandSlashItems(
  editor: BlockNoteEditor<any, any, any>, query: string, defaultCodeBlockWrap: boolean,
): SlashMenuItem[] | null {
  const turn = /^(?:turn(?:\s+into)?|转换)(?:\s+(.*))?$/i.exec(query.trim());
  if (turn) {
    const q = (turn[1] ?? "").trim().toLowerCase();
    return BLOCK_CONVERSIONS.filter((target) => `${target.label} ${aliases[target.type]}`.toLowerCase().includes(q))
      .map((target) => ({
        title: t("turnIntoBlock", { label: target.label }),
        onItemClick: () => {
          const block = editor.getTextCursorPosition().block;
          if (block.id === getProtectedTitleBlockId(editor) || editor.schema.blockSchema[block.type]?.content !== "inline") return;
          editor.updateBlock(block, {
            type: target.type,
            props: { ...("props" in target ? target.props : {}), ...(target.type === "codeBlock" ? { wrap: defaultCodeBlockWrap } : {}) },
          });
          editor.focus();
        },
      }));
  }
  const color = /^(?:color|颜色)(?:\s+(.*))?$/i.exec(query.trim());
  const direct = query.trim().toLowerCase();
  const palette = [
    ...TEXT_COLORS.map((item) => ({ ...item, prop: "textColor", alias: item.color })),
    ...HIGHLIGHT_COLORS.map((item) => ({ ...item, prop: "backgroundColor", alias: `${item.color} background` })),
  ];
  if (!color && !palette.some((item) => item.alias === direct || item.name === direct)) return null;
  const q = color ? (color[1] ?? "").trim().toLowerCase() : direct;
  return palette.filter((item) => `${item.name} ${item.alias}`.includes(q)).map((item) => ({
    title: item.name,
    onItemClick: () => {
      const block = editor.getTextCursorPosition().block;
      if (block.id === getProtectedTitleBlockId(editor)) return;
      editor.updateBlock(block, { props: { [item.prop]: item.color } });
      editor.focus();
    },
  }));
}
