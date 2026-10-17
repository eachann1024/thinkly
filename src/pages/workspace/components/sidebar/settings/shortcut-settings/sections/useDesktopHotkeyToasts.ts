import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/shortcut-settings/sections/useDesktopHotkeyToasts.ts#localMessages:1">`
zh-Hans:
  mainWindowShortcut_8e10: "主窗口快捷键"
  quickNoteShortcut_7505: "速记小窗快捷键"
  globalSearchShortcut_18d6: "全局搜索快捷键"
  shortcutEnabled: "{{label}}已生效"
  shortcutDisabled: "{{label}}已停用"
  invalidShortcut_b55e: "快捷键无效"
  registrationFailed_1c56: "注册失败"
  shortcutFailed: "{{label}}未生效"
en:
  mainWindowShortcut_8e10: "Main window shortcut"
  quickNoteShortcut_7505: "Quick Note shortcut"
  globalSearchShortcut_18d6: "Global search shortcut"
  shortcutEnabled: "{{label}} enabled"
  shortcutDisabled: "{{label}} disabled"
  invalidShortcut_b55e: "Invalid shortcut"
  registrationFailed_1c56: "Registration failed"
  shortcutFailed: "{{label}} could not be enabled"
ja:
  mainWindowShortcut_8e10: "メインウィンドウのショートカット"
  quickNoteShortcut_7505: "クイックノートウィンドウのショートカット"
  globalSearchShortcut_18d6: "グローバル検索のショートカット"
  shortcutEnabled: "{{label}}を有効にしました"
  shortcutDisabled: "{{label}}を無効にしました"
  invalidShortcut_b55e: "ショートカットが無効です"
  registrationFailed_1c56: "登録に失敗しました"
  shortcutFailed: "{{label}}を有効にできませんでした"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { formatShortcut } from "@/lib/utils";
import type { DesktopHotkeyStatus } from "@/stores/settings/types";
import { useSettings } from "@/stores/useSettings";

export type DesktopHotkeySlot = "wake" | "quicknote" | "search";

const SLOT_LABEL: Record<DesktopHotkeySlot, string> = {
  get wake() { return uiText("mainWindowShortcut_8e10"); },
  get quicknote() { return uiText("quickNoteShortcut_7505"); },
  get search() { return uiText("globalSearchShortcut_18d6"); },
};

function signature(status: DesktopHotkeyStatus, shortcut: string, enabled: boolean) {
  return `${enabled ? shortcut : ""}|${status.state}|${status.message ?? ""}`;
}

function notifyStatus(
  slot: DesktopHotkeySlot,
  status: DesktopHotkeyStatus,
  shortcut: string,
) {
  if (status.state === "idle") return;
  const label = SLOT_LABEL[slot];
  const keys = shortcut ? formatShortcut(shortcut) : "";
  if (status.state === "active") {
    toast.success(uiText("shortcutEnabled", { label }), { description: keys || undefined });
    return;
  }
  if (status.state === "disabled") {
    toast.success(uiText("shortcutDisabled", { label }));
    return;
  }
  const detail = status.message || (status.state === "invalid" ? uiText("invalidShortcut_b55e") : uiText("registrationFailed_1c56"));
  toast.error(uiText("shortcutFailed", { label }), { description: detail });
}

/** 只在用户改键后的真实注册结果变化时通知，打开设置或初次水合不提示。 */
export function useDesktopHotkeyToasts(enabled: boolean) {
  useLocale();
  const wake = useSettings((s) => s.desktop.wakeHotkeyStatus);
  const wakeHotkey = useSettings((s) => s.desktop.wakeHotkey);
  const wakeEnabled = useSettings((s) => s.desktop.wakeHotkeyEnabled);
  const quicknote = useSettings((s) => s.desktop.quicknoteHotkeyStatus);
  const quicknoteHotkey = useSettings((s) => s.desktop.quicknoteHotkey);
  const quicknoteEnabled = useSettings((s) => s.desktop.quicknoteHotkeyEnabled);
  const search = useSettings((s) => s.desktop.searchHotkeyStatus);
  const searchHotkey = useSettings((s) => s.desktop.searchHotkey);
  const searchEnabled = useSettings((s) => s.desktop.searchHotkeyEnabled);
  const ready = useRef(false);
  const previous = useRef<Record<DesktopHotkeySlot, string> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const next = {
      wake: signature(wake, wakeHotkey, wakeEnabled),
      quicknote: signature(quicknote, quicknoteHotkey, quicknoteEnabled),
      search: signature(search, searchHotkey, searchEnabled),
    };
    if (!ready.current) {
      ready.current = true;
      previous.current = next;
      return;
    }
    const before = previous.current;
    previous.current = next;
    if (!before) return;
    if (before.wake !== next.wake) notifyStatus("wake", wake, wakeHotkey);
    if (before.quicknote !== next.quicknote) {
      notifyStatus("quicknote", quicknote, quicknoteHotkey);
    }
    if (before.search !== next.search) notifyStatus("search", search, searchHotkey);
  }, [
    enabled,
    wake,
    wakeHotkey,
    wakeEnabled,
    quicknote,
    quicknoteHotkey,
    quicknoteEnabled,
    search,
    searchHotkey,
    searchEnabled,
  ]);
}
