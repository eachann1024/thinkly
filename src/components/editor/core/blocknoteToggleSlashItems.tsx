import { ChevronRight } from "@/components/ui/icons";
import { SLASH_ICONS, type SlashMenuItem } from "./blocknoteSlashModel";
import { i18nYaml, createTranslator, getLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/core/blocknoteToggleSlashItems.tsx#messages:1">`
zh-Hans:
  toggleList: "折叠列表"
  toggleHeading: "折叠{{level}}级标题"
en:
  toggleList: "Toggle list"
  toggleHeading: "Toggle heading {{level}}"
`;
const t = createTranslator(messages);


export function getToggleSlashMenuItems(insert: (block: any) => any): SlashMenuItem[] {
  return [
    {
      get title() { return t("toggleList"); },
      icon: <ChevronRight size={18} />,
      aliases: ["toggle", "toggle list", "zhedie"],
      badge: ">",
      onItemClick: () => insert({ type: "toggleListItem", props: { collapsed: false } }),
    },
    ...([1, 2, 3] as const).map((level) => ({
      title: t("toggleHeading", { level: getLocale() === "zh-Hans" ? ["一", "二", "三"][level - 1] : level }),
      icon: SLASH_ICONS[`heading${level}`],
      aliases: [`toggle heading ${level}`, `toggleh${level}`, `zhediebiaoti${level}`],
      onItemClick: () => insert({
        type: "heading",
        props: { level, isToggleable: true, collapsed: false },
      }),
    })),
  ];
}
