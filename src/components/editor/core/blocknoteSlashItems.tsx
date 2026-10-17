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
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/core/blocknoteSlashItems.tsx#messages:1">`
zh-Hans:
  generate: "生成"
  continueWriting: "接着写点内容…"
  text: "文本"
  heading1: "一级标题"
  largeHeading: "大标题"
  heading2: "二级标题"
  mediumHeading: "中标题"
  heading3: "三级标题"
  smallHeading: "小标题"
  checklist: "待办事项"
  aListOfTasksWithCheckboxes: "带有复选框的任务列表"
  bulletedList: "无序列表"
  createABulletedList: "创建普通的项目符号列表"
  numberedList: "有序列表"
  createANumberedList: "创建带有数字的列表"
  quote: "引用"
  insertAQuote: "插入一段引用文字"
  callout: "标注"
  insertACalloutWithAnIcon: "插入带图标的重点标注块"
  divider: "分隔线"
  insertAHorizontalDivider: "插入一条水平分割线"
  table: "表格"
  insertASimpleTable: "插入一个简单的表格"
  codeBlock: "代码块"
  insertACodeBlockWithSyntaxHighlighting: "插入带语法高亮的代码块"
  mathFormula: "数学公式"
  insertAMathFormulaKatex: "插入数学公式块 (KaTeX)"
  mermaidDiagram: "Mermaid 图表"
  insertAFlowchartSequenceDiagramAndMoreMermaid: "插入流程图、时序图等 (Mermaid)"
en:
  generate: "Generate"
  continueWriting: "Continue writing…"
  text: "Text"
  heading1: "Heading 1"
  largeHeading: "Large heading"
  heading2: "Heading 2"
  mediumHeading: "Medium heading"
  heading3: "Heading 3"
  smallHeading: "Small heading"
  checklist: "Checklist"
  aListOfTasksWithCheckboxes: "A list of tasks with checkboxes"
  bulletedList: "Bulleted list"
  createABulletedList: "Create a bulleted list"
  numberedList: "Numbered list"
  createANumberedList: "Create a numbered list"
  quote: "Quote"
  insertAQuote: "Insert a quote"
  callout: "Callout"
  insertACalloutWithAnIcon: "Insert a callout with an icon"
  divider: "Divider"
  insertAHorizontalDivider: "Insert a horizontal divider"
  table: "Table"
  insertASimpleTable: "Insert a simple table"
  codeBlock: "Code block"
  insertACodeBlockWithSyntaxHighlighting: "Insert a code block with syntax highlighting"
  mathFormula: "Math formula"
  insertAMathFormulaKatex: "Insert a math formula (KaTeX)"
  mermaidDiagram: "Mermaid diagram"
  insertAFlowchartSequenceDiagramAndMoreMermaid: "Insert a flowchart, sequence diagram, and more (Mermaid)"
`;
const t = createTranslator(messages);

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
      get title() { return t("generate"); },
      get description() { return t("continueWriting"); },
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
    { get title() { return t("text"); }, aliases: ["text", "paragraph", "wenben"], onItemClick: () => insertOrUpdate({ type: "paragraph" }) },
    {
      get title() { return t("heading1"); },
      get description() { return t("largeHeading"); },
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
      get title() { return t("heading2"); },
      get description() { return t("mediumHeading"); },
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
      get title() { return t("heading3"); },
      get description() { return t("smallHeading"); },
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
      get title() { return t("checklist"); },
      get description() { return t("aListOfTasksWithCheckboxes"); },
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
      get title() { return t("bulletedList"); },
      get description() { return t("createABulletedList"); },
      icon: SLASH_ICONS.list,
      aliases: ["list", "bullet", "liebiao"],
      badge: "-",
      onItemClick: () => insertOrUpdate({ type: "bulletListItem" }),
    },
    {
      get title() { return t("numberedList"); },
      get description() { return t("createANumberedList"); },
      icon: SLASH_ICONS.listOrdered,
      aliases: ["ordered", "list", "liebiao"],
      badge: "1.",
      onItemClick: () => insertOrUpdate({ type: "numberedListItem" }),
    },
    {
      get title() { return t("quote"); },
      get description() { return t("insertAQuote"); },
      icon: SLASH_ICONS.quote,
      aliases: ["quote", "blockquote", "yinyong"],
      badge: '" ',
      onItemClick: () => insertOrUpdate({ type: "quote" }),
    },
    {
      get title() { return t("callout"); },
      get description() { return t("insertACalloutWithAnIcon"); },
      icon: SLASH_ICONS.info,
      aliases: ["callout", "annotation", "info", "biaozhu", "tishi"],
      onItemClick: () => insertOrUpdate({ type: "callout" }),
    },
    {
      get title() { return t("divider"); },
      get description() { return t("insertAHorizontalDivider"); },
      icon: SLASH_ICONS.minus,
      aliases: ["divider", "separator", "hr", "fengexian"],
      badge: "---",
      onItemClick: () => insertOrUpdate({ type: "divider" }),
    },
    { type: "divider" } as any,
    {
      get title() { return t("table"); },
      get description() { return t("insertASimpleTable"); },
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
      get title() { return t("codeBlock"); },
      get description() { return t("insertACodeBlockWithSyntaxHighlighting"); },
      icon: SLASH_ICONS.code,
      aliases: ["code", "block", "daima"],
      badge: "```",
      onItemClick: () =>
        insertOrUpdate({ type: "codeBlock", props: { language: "text" } }),
    },
    {
      get title() { return t("mathFormula"); },
      get description() { return t("insertAMathFormulaKatex"); },
      icon: SLASH_ICONS.sigma,
      aliases: ["math", "formula", "gongshi", "katex"],
      onItemClick: () =>
        insertOrUpdate({ type: "codeBlock", props: { language: "math" } }),
    },
    {
      get title() { return t("mermaidDiagram"); },
      get description() { return t("insertAFlowchartSequenceDiagramAndMoreMermaid"); },
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
