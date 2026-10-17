import { SLASH_ICONS, type SlashMenuItem } from "./blocknoteSlashModel";
import { i18nYaml, createTranslator, getLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/core/blocknoteToggleSlashItems.tsx#messages:1">`
zh-Hans:
  toggleHeading: "折叠{{level}}级标题"
en:
  toggleHeading: "Toggle heading {{level}}"
ja:
  toggleHeading: "トグル見出し {{level}}"
`;
const t = createTranslator(messages);


export function getToggleSlashMenuItems(insert: (block: any) => any): SlashMenuItem[] {
  return [
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
