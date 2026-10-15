import { ChevronRight } from "@/components/ui/icons";
import { SLASH_ICONS, type SlashMenuItem } from "./blocknoteSlashModel";

export function getToggleSlashMenuItems(insert: (block: any) => any): SlashMenuItem[] {
  return [
    {
      title: "折叠列表",
      icon: <ChevronRight size={18} />,
      aliases: ["toggle", "toggle list", "zhedie"],
      badge: ">",
      onItemClick: () => insert({ type: "toggleListItem", props: { collapsed: false } }),
    },
    ...([1, 2, 3] as const).map((level) => ({
      title: `折叠${["一", "二", "三"][level - 1]}级标题`,
      icon: SLASH_ICONS[`heading${level}`],
      aliases: [`toggle heading ${level}`, `toggleh${level}`, `zhediebiaoti${level}`],
      onItemClick: () => insert({
        type: "heading",
        props: { level, isToggleable: true, collapsed: false },
      }),
    })),
  ];
}
