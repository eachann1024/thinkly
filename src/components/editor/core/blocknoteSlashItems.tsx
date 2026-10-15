import type { BlockNoteEditor } from "@blocknote/core";
import { GooseAIExtension } from "@/components/editor/ai/GooseAIExtension";
import { createSlashBlockInsertion } from "./blocknoteSlashActions";
import { getColumnSlashMenuItems } from "./blocknoteColumnSlashItems";
import { getToggleSlashMenuItems } from "./blocknoteToggleSlashItems";
import { getMediaSlashMenuItems } from "./blocknoteMediaSlashItems";
import {
  SLASH_ICONS,
  filterCompactSlashMenuItems,
  type SlashMenuItem,
  type SlashMenuFeaturePolicy,
} from "./blocknoteSlashModel";
export {
  warmupSlashMenuIcons,
  isSlashMenuDivider,
  COMPACT_SLASH_MENU_TITLES,
  filterCompactSlashMenuItems,
  filterSlashMenuItems,
} from "./blocknoteSlashModel";
export type {
  SlashMenuItem,
  SlashMenuFeaturePolicy,
} from "./blocknoteSlashModel";

export function getBlockNoteSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>,
  aiEnabled: boolean,
  features: SlashMenuFeaturePolicy = {
    transcodeVideoUploads: true,
    openAttachmentsExternally: true,
  },
  options?: { compact?: boolean; defaultCodeBlockWrap?: boolean },
): SlashMenuItem[] {
  const insertOrUpdate = createSlashBlockInsertion(editor, options?.defaultCodeBlockWrap);

  const items: SlashMenuItem[] = [];

  const compact = Boolean(options?.compact) || __GOOSE_EDITOR_COMPACT__;

  // 未启用 AI 的构建 / 小窗不添加「生成」斜杠项。
  if (aiEnabled && (__GOOSE_EDITOR_AI__ || false) && !compact) {
    items.push({
      title: "生成",
      description: "接着写点内容…",
      icon: SLASH_ICONS.sparkles,
      aliases: ["ai", "generate", "shengcheng", "xiezuo", "sparkle"],
      onItemClick: () => {
        // 删除触发字符 / 或 、
        const pos = editor.getTextCursorPosition();
        const block = pos.block;
        const content = block.content as any[];
        if (
          Array.isArray(content) &&
          content.length === 1 &&
          content[0]?.type === "text" &&
          (content[0].text === "/" || content[0].text === "、")
        ) {
          editor.updateBlock(block, { content: [] });
        } else if (
          Array.isArray(content) &&
          content.length >= 1 &&
          content[0]?.type === "text" &&
          (content[0].text.startsWith("/") || content[0].text.startsWith("、"))
        ) {
          const newText = content[0].text.slice(1);
          editor.updateBlock(block, {
            content: newText ? [{ ...content[0], text: newText }] : [],
          });
        }

        const ai = editor.getExtension(GooseAIExtension);
        const blockId = editor.getTextCursorPosition().block.id;
        if (ai && blockId) {
          ai.openAIMenuAtBlock(blockId);
        }
      },
    });
  }

  items.push(
    { title: "文本", aliases: ["text", "paragraph", "wenben"], onItemClick: () => insertOrUpdate({ type: "paragraph" }) },
    {
      title: "一级标题",
      description: "大标题",
      icon: SLASH_ICONS.heading1,
      aliases: ["h1", "heading1", "title", "biaoti"],
      badge: "#",
      onItemClick: () =>
        insertOrUpdate({
          type: "heading",
          props: { level: 1, isToggleable: false, collapsed: false },
        }),
    },
    {
      title: "二级标题",
      description: "中标题",
      icon: SLASH_ICONS.heading2,
      aliases: ["h2", "heading2", "subtitle", "biaoti"],
      badge: "##",
      onItemClick: () =>
        insertOrUpdate({
          type: "heading",
          props: { level: 2, isToggleable: false, collapsed: false },
        }),
    },
    {
      title: "三级标题",
      description: "小标题",
      icon: SLASH_ICONS.heading3,
      aliases: ["h3", "heading3", "biaoti"],
      badge: "###",
      onItemClick: () =>
        insertOrUpdate({
          type: "heading",
          props: { level: 3, isToggleable: false, collapsed: false },
        }),
    },
    ...getToggleSlashMenuItems(insertOrUpdate),
    { type: "divider" } as any,
    {
      title: "待办事项",
      description: "带有复选框的任务列表",
      icon: SLASH_ICONS.check,
      aliases: [
        "todo",
        "task",
        "daiban",
        "renwu",
        "提醒",
        "提醒事项",
        "tixing",
      ],
      badge: "[]",
      onItemClick: () => insertOrUpdate({ type: "checkListItem" }),
    },
    {
      title: "无序列表",
      description: "创建普通的项目符号列表",
      icon: SLASH_ICONS.list,
      aliases: ["list", "bullet", "liebiao"],
      badge: "-",
      onItemClick: () => insertOrUpdate({ type: "bulletListItem" }),
    },
    {
      title: "有序列表",
      description: "创建带有数字的列表",
      icon: SLASH_ICONS.listOrdered,
      aliases: ["ordered", "list", "liebiao"],
      badge: "1.",
      onItemClick: () => insertOrUpdate({ type: "numberedListItem" }),
    },
    {
      title: "引用",
      description: "插入一段引用文字",
      icon: SLASH_ICONS.quote,
      aliases: ["quote", "blockquote", "yinyong"],
      badge: '" ',
      onItemClick: () => insertOrUpdate({ type: "quote" }),
    },
    {
      title: "标注",
      description: "插入带图标的重点标注块",
      icon: SLASH_ICONS.info,
      aliases: ["callout", "annotation", "info", "biaozhu", "tishi"],
      onItemClick: () => insertOrUpdate({ type: "callout" }),
    },
    {
      title: "分隔线",
      description: "插入一条水平分割线",
      icon: SLASH_ICONS.minus,
      aliases: ["divider", "separator", "hr", "fengexian"],
      badge: "---",
      onItemClick: () => insertOrUpdate({ type: "divider" }),
    },
    { type: "divider" } as any,
    {
      title: "表格",
      description: "插入一个简单的表格",
      icon: SLASH_ICONS.table,
      aliases: ["table", "biaoge"],
      onItemClick: () => {
        insertOrUpdate({
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["", "", ""] }, { cells: ["", "", ""] }],
          },
        } as any);
      },
    },
    {
      title: "代码块",
      description: "插入带语法高亮的代码块",
      icon: SLASH_ICONS.code,
      aliases: ["code", "block", "daima"],
      badge: "```",
      onItemClick: () =>
        insertOrUpdate({ type: "codeBlock", props: { language: "text" } }),
    },
    {
      title: "数学公式",
      description: "插入数学公式块 (KaTeX)",
      icon: SLASH_ICONS.sigma,
      aliases: ["math", "formula", "gongshi", "katex"],
      onItemClick: () =>
        insertOrUpdate({ type: "codeBlock", props: { language: "math" } }),
    },
    {
      title: "Mermaid 图表",
      description: "插入流程图、时序图等 (Mermaid)",
      icon: SLASH_ICONS.mermaid,
      aliases: ["mermaid", "chart", "diagram", "tubiao"],
      onItemClick: () =>
        insertOrUpdate({ type: "codeBlock", props: { language: "mermaid" } }),
    },
    ...getColumnSlashMenuItems(editor),
    ...getMediaSlashMenuItems(editor, insertOrUpdate),
  );

  let menuItems = items;

  if (compact) {
    menuItems = filterCompactSlashMenuItems(menuItems);
  }

  return menuItems;
}
