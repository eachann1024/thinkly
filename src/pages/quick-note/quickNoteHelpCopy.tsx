import { createTranslator, i18nYaml } from "@/i18n/core";
import { formatShortcut, type PlatformKind } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import type { ReactNode } from "react";

const localMessages = i18nYaml<"src/pages/quick-note/quickNoteHelpCopy.tsx#localMessages:1">`
zh-Hans:
  helpSlots: "顶部 1–5 是五张各自独立的速记。"
  helpSwitch: "{{shortcut}} 切换速记。"
  helpFontSize: "字号：{{increase}} 放大，{{decrease}} 缩小，{{reset}} 重置。"
en:
  helpSlots: "The numbers 1–5 are five separate notes."
  helpSwitch: "{{shortcut}} switches Quick Notes."
  helpFontSize: "Font size: {{increase}} increase, {{decrease}} decrease, {{reset}} reset."
ja:
  helpSlots: "上部の 1〜5 は、それぞれ独立した 5 つのクイックノートです。"
  helpSwitch: "{{shortcut}} でクイックノートを切り替えます。"
  helpFontSize: "文字サイズ：{{increase}} 拡大、{{decrease}} 縮小、{{reset}} リセット。"
`;
const uiText = createTranslator(localMessages);

export const QUICK_NOTE_SLOT_SWITCH_SHORTCUT = "Mod+1～5";

export function formatQuickNoteSlotSwitchShortcut(platform: PlatformKind): string {
  return formatShortcut(QUICK_NOTE_SLOT_SWITCH_SHORTCUT, platform);
}

function withShortcutKeys(text: string, shortcuts: Record<string, string>, platform: PlatformKind): ReactNode {
  return text.split(/(\{\w+\})/g).map((part, index) => {
    const shortcut = shortcuts[part];
    return shortcut
      ? <Kbd key={index} shortcut={shortcut} platform={platform} variant="default" />
      : part;
  });
}

export function quickNoteHelpLines(platform: PlatformKind): readonly ReactNode[] {
  return [
    uiText("helpSlots"),
    withShortcutKeys(uiText("helpSwitch", { shortcut: "{shortcut}" }), {
      "{shortcut}": QUICK_NOTE_SLOT_SWITCH_SHORTCUT,
    }, platform),
    withShortcutKeys(uiText("helpFontSize", {
      increase: "{increase}", decrease: "{decrease}", reset: "{reset}",
    }), {
      "{increase}": "Mod+=", "{decrease}": "Mod+-", "{reset}": "Mod+0",
    }, platform),
  ];
}
