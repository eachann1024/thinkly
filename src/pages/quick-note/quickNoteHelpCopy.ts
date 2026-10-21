import { createTranslator, i18nYaml } from "@/i18n/core";
import { formatShortcut, type PlatformKind } from "@/lib/utils";

const localMessages = i18nYaml<"src/pages/quick-note/quickNoteHelpCopy.ts#localMessages:1">`
zh-Hans:
  helpSlots: "顶部 1–5 是五张各自独立的速记。"
  helpSwitch: "{{shortcut}} 切换速记。"
en:
  helpSlots: "The numbers 1–5 are five separate notes."
  helpSwitch: "{{shortcut}} switches Quick Notes."
ja:
  helpSlots: "上部の 1〜5 は、それぞれ独立した 5 つのクイックノートです。"
  helpSwitch: "{{shortcut}} でクイックノートを切り替えます。"
`;
const uiText = createTranslator(localMessages);

/** 槽位切换。Mod 交给 formatShortcut：macOS 为 ⌘，其余平台为 Ctrl。 */
export const QUICK_NOTE_SLOT_SWITCH_SHORTCUT = "Mod+1～5";

export function formatQuickNoteSlotSwitchShortcut(platform: PlatformKind): string {
  return formatShortcut(QUICK_NOTE_SLOT_SWITCH_SHORTCUT, platform);
}

/** 说明弹层的两行正文：槽位说明，以及随平台变化的切换快捷键。 */
export function quickNoteHelpLines(platform: PlatformKind): readonly [string, string] {
  return [
    uiText("helpSlots"),
    uiText("helpSwitch", { shortcut: formatQuickNoteSlotSwitchShortcut(platform) }),
  ];
}
