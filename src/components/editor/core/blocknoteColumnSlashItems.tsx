import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/core/blocknoteColumnSlashItems.tsx#messages:1">`
zh-Hans:
  columns: "{{count}} 栏"
en:
  columns: "{{count}} columns"
`;
const t = createTranslator(messages);
import type { BlockNoteEditor } from "@blocknote/core";
import { Columns2 } from "@/components/ui/icons";
import { insertColumnsFromSlash } from "../blocks/columns/columnActions";
import type { SlashMenuItem } from "./blocknoteSlashModel";

export function getColumnSlashMenuItems(editor: BlockNoteEditor<any, any, any>): SlashMenuItem[] {
  return ([2, 3] as const).map((count) => ({
    title: t("columns", { count }),
    icon: <Columns2 size={18} />,
    aliases: [`${count} columns`, `${count}columns`, `columns${count}`, `${count}lan`, `${count}栏`, "分栏"],
    onItemClick: () => insertColumnsFromSlash(editor, count),
  }));
}
