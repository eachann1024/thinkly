import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/hooks/useDesktopHotkeys.ts#block1:1">`
zh-Hans:
  hotkeysFailed: "桌面快捷键注册失败"
  mainDisabled: "已关闭主窗口全局快捷键"
  quicknoteDisabled: "已关闭速记小窗全局快捷键"
  searchDisabled: "已关闭全局搜索快捷键"
  shortcutUnavailable: "已被系统或其他应用占用，没有生效。请换一个，或恢复默认。"
  searchShortcutUpdated: "全局搜索快捷键已更新"
  searchShortcutUpdatedDetail: "Ctrl+Shift 在 Windows 上常被系统占用。已改成可用的默认快捷键。"
en:
  hotkeysFailed: "Couldn’t register desktop shortcuts."
  mainDisabled: "The global shortcut for the main window is off."
  quicknoteDisabled: "The global shortcut for Quick Note is off."
  searchDisabled: "The global search shortcut is off."
  shortcutUnavailable: "This shortcut is reserved by the system or another app and did not register. Choose another, or reset to the default."
  searchShortcutUpdated: "Global search shortcut updated"
  searchShortcutUpdatedDetail: "Ctrl+Shift is often reserved by Windows. The shortcut is now the working default."
ja:
  hotkeysFailed: "デスクトップのショートカットを登録できませんでした"
  mainDisabled: "メインウィンドウのグローバルショートカットをオフにしました"
  quicknoteDisabled: "クイックノートのグローバルショートカットをオフにしました"
  searchDisabled: "グローバル検索のショートカットをオフにしました"
  shortcutUnavailable: "システムまたは他のアプリが使用しているため登録できません。別のキーにするか、初期設定に戻してください。"
  searchShortcutUpdated: "グローバル検索のショートカットを更新しました"
  searchShortcutUpdatedDetail: "Windows では Ctrl+Shift がシステムに使われることがあります。使える初期設定に変更しました。"
`);
import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { isSetupGuideVisible } from "@/lib/setupGuide";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { syncAllDesktopGlobalHotkeys } from "@/lib/electron/globalHotkeys";
import {
  isShortcutRecorderTarget,
  shouldResumeGlobalHotkeysAfterFocusOut,
} from "@/lib/electron/hotkeyCapture";
import { formatShortcut, getPlatformKind } from "@/lib/utils";
import {
  legacySearchHotkeyReplacement,
  takeLegacySearchHotkeyNotice,
} from "@/stores/settings/types/desktop";
import { useSettings } from "@/stores/useSettings";
import type { DesktopHotkeyStatus } from "@/stores/settings/types";
import type { HostHotkeyRegisterResult } from "@/lib/host/types";

const announcedHotkeyFailures = new Map<string, number>();

function announceHotkeyFailure(shortcut: string, status: DesktopHotkeyStatus): void {
  if (status.state !== "occupied" && status.state !== "invalid" && status.state !== "error") return;
  const message = status.message || storeText("shortcutUnavailable");
  const key = `${shortcut}|${status.state}|${message}`;
  const now = Date.now();
  if (now - (announcedHotkeyFailures.get(key) ?? 0) < 1500) return;
  announcedHotkeyFailures.set(key, now);
  toast.error(message, {
    description: shortcut.trim() ? formatShortcut(shortcut) : undefined,
  });
}

function announceSearchHotkeyMoved(): void {
  toast.message(storeText("searchShortcutUpdated"), {
    description: storeText("searchShortcutUpdatedDetail"),
  });
}

function statusFromRegisterResult(
  enabled: boolean,
  shortcut: string,
  result: HostHotkeyRegisterResult,
  disabledMessage: string,
): DesktopHotkeyStatus {
  if (!enabled || !shortcut.trim()) {
    return { state: "disabled", message: disabledMessage };
  }
  if (result.ok) return { state: "active" };
  return {
    state: result.state ?? "error",
    message: result.error,
    rawError: result.error,
  };
}

export function useDesktopHotkeys(): void {
  useLocale();
  const hydrated = useSettings((s) => s._hasHydrated);
  const wakeHotkey = useSettings((s) => s.desktop.wakeHotkey);
  const wakeHotkeyEnabled = useSettings((s) => s.desktop.wakeHotkeyEnabled);
  const quicknoteHotkey = useSettings((s) => s.desktop.quicknoteHotkey);
  const quicknoteHotkeyEnabled = useSettings(
    (s) => s.desktop.quicknoteHotkeyEnabled,
  );
  const searchHotkey = useSettings((s) => s.desktop.searchHotkey);
  const searchHotkeyEnabled = useSettings((s) => s.desktop.searchHotkeyEnabled);

  useEffect(() => {
    if (!hydrated) return;
    const api = getGooseDesktop();
    if (!api?.onOpenSearch) return;
    return api.onOpenSearch(() => {
      if (isSetupGuideVisible(useSettings.getState())) return;
      window.dispatchEvent(new CustomEvent("goose-note:open-search"));
    });
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const api = getGooseDesktop();
    if (!api?.onWorkspaceAction) return;
    return api.onWorkspaceAction((action) => {
      if (isSetupGuideVisible(useSettings.getState())) return;
      if (action === "search") {
        window.dispatchEvent(new CustomEvent("goose-note:open-search"));
        return;
      }
      if (action === "settings") {
        window.dispatchEvent(new CustomEvent("goose-note:open-settings"));
        return;
      }
      if (action === "ai-panel") {
        window.dispatchEvent(new CustomEvent("goose-note:open-ai-panel"));
        return;
      }
      if (action === "new-note") {
        window.dispatchEvent(new CustomEvent("goose-note:new-note"));
      }
    });
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const platform = getPlatformKind() === "windows" ? "win32" : "";
    const replacement = legacySearchHotkeyReplacement(searchHotkey, platform);
    if (replacement && replacement !== searchHotkey) {
      useSettings.getState().setSearchHotkey(replacement);
      takeLegacySearchHotkeyNotice();
      announceSearchHotkeyMoved();
      return;
    }
    if (takeLegacySearchHotkeyNotice()) announceSearchHotkeyMoved();
    let cancelled = false;

    void (async () => {
      const failed: HostHotkeyRegisterResult = {
        ok: false,
        state: "error",
        error: storeText("hotkeysFailed"),
      };
      let result: {
        wake: HostHotkeyRegisterResult;
        quicknote: HostHotkeyRegisterResult;
        search: HostHotkeyRegisterResult;
        deferred?: boolean;
      };
      try {
        result = await syncAllDesktopGlobalHotkeys({
          wake: { shortcut: wakeHotkey, enabled: wakeHotkeyEnabled },
          quicknote: {
            shortcut: quicknoteHotkey,
            enabled: quicknoteHotkeyEnabled,
          },
          search: { shortcut: searchHotkey, enabled: searchHotkeyEnabled },
        });
      } catch {
        result = { wake: failed, quicknote: failed, search: failed };
      }
      if (cancelled) return;
      const settings = useSettings.getState();
      const wakeStatus = statusFromRegisterResult(
        wakeHotkeyEnabled,
        wakeHotkey,
        result.wake,
        storeText("mainDisabled"),
      );
      const quicknoteStatus = statusFromRegisterResult(
        quicknoteHotkeyEnabled,
        quicknoteHotkey,
        result.quicknote,
        storeText("quicknoteDisabled"),
      );
      const searchStatus = statusFromRegisterResult(
        searchHotkeyEnabled,
        searchHotkey,
        result.search,
        storeText("searchDisabled"),
      );
      settings.setWakeHotkeyStatus(wakeStatus);
      settings.setQuicknoteHotkeyStatus(quicknoteStatus);
      settings.setSearchHotkeyStatus(searchStatus);
      if (!result.deferred) {
        announceHotkeyFailure(wakeHotkey, wakeStatus);
        announceHotkeyFailure(quicknoteHotkey, quicknoteStatus);
        announceHotkeyFailure(searchHotkey, searchStatus);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    wakeHotkey,
    wakeHotkeyEnabled,
    quicknoteHotkey,
    quicknoteHotkeyEnabled,
    searchHotkey,
    searchHotkeyEnabled,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    const api = getGooseDesktop();
    if (!api?.pauseHotkeys || !api?.resumeHotkeys) return;

    const applyRegisterResult = (result: {
      wakeOk: boolean;
      quicknoteOk: boolean;
      searchOk: boolean;
    }) => {
      const settings = useSettings.getState();
      const desktop = settings.desktop;
      const wakeStatus: DesktopHotkeyStatus =
        !desktop.wakeHotkeyEnabled || !desktop.wakeHotkey.trim()
          ? { state: "disabled", message: storeText("mainDisabled") }
          : result.wakeOk
            ? { state: "active" }
            : {
                state: "occupied",
                message: storeText("shortcutUnavailable"),
              };
      const quicknoteStatus: DesktopHotkeyStatus =
        !desktop.quicknoteHotkeyEnabled || !desktop.quicknoteHotkey.trim()
          ? { state: "disabled", message: storeText("quicknoteDisabled") }
          : result.quicknoteOk
            ? { state: "active" }
            : {
                state: "occupied",
                message: storeText("shortcutUnavailable"),
              };
      const searchStatus: DesktopHotkeyStatus =
        !desktop.searchHotkeyEnabled || !desktop.searchHotkey.trim()
          ? { state: "disabled", message: storeText("searchDisabled") }
          : result.searchOk
            ? { state: "active" }
            : {
                state: "occupied",
                message: storeText("shortcutUnavailable"),
              };
      settings.setWakeHotkeyStatus(wakeStatus);
      settings.setQuicknoteHotkeyStatus(quicknoteStatus);
      settings.setSearchHotkeyStatus(searchStatus);
      announceHotkeyFailure(desktop.wakeHotkey, wakeStatus);
      announceHotkeyFailure(desktop.quicknoteHotkey, quicknoteStatus);
      announceHotkeyFailure(desktop.searchHotkey, searchStatus);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isShortcutRecorderTarget(event.target)) return;
      void api.pauseHotkeys();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (
        !shouldResumeGlobalHotkeysAfterFocusOut(
          event.target,
          event.relatedTarget,
        )
      ) {
        return;
      }
      void api.resumeHotkeys().then(applyRegisterResult);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      void api.resumeHotkeys().then(applyRegisterResult);
    };
  }, [hydrated]);
}
