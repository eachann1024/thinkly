import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { formatShortcut } from "@/lib/utils";
import type { DesktopHotkeyStatus } from "@/stores/settings/types";
import { useSettings } from "@/stores/useSettings";

export type DesktopHotkeySlot = "wake" | "quicknote" | "search";

const SLOT_LABEL: Record<DesktopHotkeySlot, string> = {
  wake: "主窗口快捷键",
  quicknote: "速记小窗快捷键",
  search: "全局搜索快捷键",
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
    toast.success(`${label}已生效`, { description: keys || undefined });
    return;
  }
  if (status.state === "disabled") {
    toast.success(`${label}已停用`);
    return;
  }
  const detail = status.message || (status.state === "invalid" ? "快捷键无效" : "注册失败");
  toast.error(`${label}未生效`, { description: detail });
}

/** 只在用户改键后的真实注册结果变化时通知，打开设置或初次水合不提示。 */
export function useDesktopHotkeyToasts(enabled: boolean) {
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
