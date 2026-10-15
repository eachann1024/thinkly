import type { BlockNoteEditor } from "@blocknote/core";
import { BLOCK_CONVERSIONS } from "../menus/blockMenuActions";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { TEXT_COLORS, HIGHLIGHT_COLORS } from "../toolbars/formatting/colorPalette";
import type { SlashMenuItem } from "./blocknoteSlashModel";

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
        title: `转换为${target.label}`,
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
