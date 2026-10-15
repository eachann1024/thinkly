import type { BlockNoteEditor } from "@blocknote/core";
import { Columns2 } from "@/components/ui/icons";
import { insertColumnsFromSlash } from "../blocks/columns/columnActions";
import type { SlashMenuItem } from "./blocknoteSlashModel";

export function getColumnSlashMenuItems(editor: BlockNoteEditor<any, any, any>): SlashMenuItem[] {
  return ([2, 3] as const).map((count) => ({
    title: `${count} 栏`,
    icon: <Columns2 size={18} />,
    aliases: [`${count} columns`, `${count}columns`, `columns${count}`, `${count}lan`, `${count}栏`, "分栏"],
    onItemClick: () => insertColumnsFromSlash(editor, count),
  }));
}
