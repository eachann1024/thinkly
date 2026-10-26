import type { BlockNoteEditor } from "@blocknote/core";
import { createSlashBlockInsertion } from "./blocknoteSlashActions";
import {
  SLASH_ICONS,
  filterCompactSlashMenuItems,
  type SlashMenuItem,
  type SlashMenuFeaturePolicy,
} from "./blocknoteSlashModel";
import { createTranslator } from "@/i18n";
import messages from "./blocknoteSlashItems.messages.yaml";
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
  features: SlashMenuFeaturePolicy = {
    transcodeVideoUploads: true,
    openAttachmentsExternally: true,
  },
  options?: { compact?: boolean; defaultCodeBlockWrap?: boolean },
): SlashMenuItem[] {
  const insertOrUpdate = createSlashBlockInsertion(editor, options?.defaultCodeBlockWrap);

  const items: SlashMenuItem[] = [];

  const compact = Boolean(options?.compact) || __GOOSE_EDITOR_COMPACT__;

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
          props: { level: 1 },
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
          props: { level: 2 },
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
          props: { level: 3 },
        }),
    },
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
      badge: ">",
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
  );

  let menuItems = items;

  if (compact) {
    menuItems = filterCompactSlashMenuItems(menuItems);
  }

  return menuItems;
}
