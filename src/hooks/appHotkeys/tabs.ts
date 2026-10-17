import { effectiveSingleTabMode } from "@/lib/tabMode";
import { createDesktopWindow } from "@/lib/electron/windowContext";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { useTabs } from "@/stores/useTabs";
import { useSidebarView } from "@/stores/useSidebarView";
import { useSettings } from "@/stores/useSettings";
import { normalizeSidebarRailOrder } from "@/stores/settings/slices/sidebarRailSlice";
import { matchShortcut } from "@/lib/shortcut-match";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import type { HotkeyEntry } from "./types";
import type { AppHotkeyActions } from "./actions";

export function createTabsHotkeys(actions: AppHotkeyActions): HotkeyEntry[] {
  const {
    appShortcutsRef,
    openTabsRef,
    activeTabIdRef,
    fixedShortcuts,
    matchesConfiguredShortcut,
    runUnifiedClose,
  } = actions;
  return [
    // new-tab (Mod+T)
    {
      id: "new-tab",
      shortcutId: "newTab",
      match: (event) => {
        const s = appShortcutsRef.current.newTab;
        return !!s && matchesConfiguredShortcut(event, s);
      },
      when: () => {
        if (effectiveSingleTabMode()) return false;
        const hasOpenModal = () =>
          !!document.querySelector(
            '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
          );
        return !hasOpenModal();
      },
      handler: (event) => {
        event.preventDefault();
        useTabs.getState().openNewTab();
      },
    },
    // Cmd+Shift+N：新桌面窗口（主进程 API 用可选链兜底）
    {
      id: "new-window",
      match: (event) =>
        !event.defaultPrevented &&
        matchesConfiguredShortcut(event, "Mod+Shift+N"),
      when: (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest?.("[data-shortcut-recorder]")) return false;
        return true;
      },
      handler: (event) => {
        event.preventDefault();
        void createDesktopWindow({ mode: "blank" });
      },
    },
    // Escape only dismisses transient UI; desktop Mod+W retains ordered close.
    {
      id: "unified-close",
      match: (event) =>
        !event.defaultPrevented &&
        isElectronRuntime() &&
        matchShortcut(event, "Mod+W"),
      handler: (event) => {
        event.preventDefault();
        event.stopPropagation();
        runUnifiedClose();
      },
    },
    // Cmd/Ctrl+1~4 按图标栏顺序切换入口；AI 项开关 AI 面板。不绑定 Cmd+0（字体缩放重置）。
    {
      id: "switch-sidebar-view-by-number",
      match: (event) => {
        if (event.defaultPrevented) return false;
        if (
          !isPlatformPrimaryModifierEvent(event) ||
          event.altKey ||
          event.shiftKey
        ) {
          return false;
        }
        return /^Digit[1-4]$/.test(event.code);
      },
      handler: (event) => {
        event.preventDefault();
        const order = normalizeSidebarRailOrder(useSettings.getState().sidebarRailOrder);
        const item = order[Number(event.code.slice(-1)) - 1];
        // 与按钮一致只派发事件；AI 未启用或不可用时由工作区监听方忽略。
        if (item === "ai") {
          window.dispatchEvent(new CustomEvent("goose-note:toggle-ai-panel"));
          return;
        }
        if (useSidebarView.getState().sidebarCollapsed) {
          useSidebarView.getState().setSidebarCollapsed(false);
        }
        window.dispatchEvent(
          new CustomEvent("goose-note:switch-sidebar-view", { detail: { view: item } }),
        );
      },
    },
    // Cmd/Ctrl+5~8 跳到对应序号标签，Cmd/Ctrl+9 跳到最后一个。1~4 已用于图标栏入口。
    {
      id: "switch-tab-by-number",
      match: (event) => {
        if (effectiveSingleTabMode()) return false;
        if (event.defaultPrevented) return false;
        if (
          !isPlatformPrimaryModifierEvent(event) ||
          event.altKey ||
          event.shiftKey
        ) {
          return false;
        }
        return /^Digit[5-9]$/.test(event.code);
      },
      handler: (event) => {
        const digit = Number(event.code.slice(-1));
        const tabs = openTabsRef.current;
        const targetTab = digit === 9 ? tabs[tabs.length - 1] : tabs[digit - 5];
        if (!targetTab) return;
        event.preventDefault();
        useTabs.getState().setActiveTab(targetTab.id);
      },
    },
    // Ctrl+Tab / Ctrl+Shift+Tab cycle tabs
    {
      id: "cycle-tab",
      match: (event) =>
        !effectiveSingleTabMode() &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key === "Tab",
      handler: (event) => {
        const tabs = openTabsRef.current;
        if (tabs.length < 2) return;
        event.preventDefault();
        const currentIndex = tabs.findIndex(
          (tab) => tab.id === activeTabIdRef.current,
        );
        const direction = event.shiftKey ? -1 : 1;
        const nextIndex =
          (currentIndex + direction + tabs.length) % tabs.length;
        useTabs.getState().setActiveTab(tabs[nextIndex].id);
      },
    },
    // 与 Chrome 一致，固定使用 Mod+Shift+T，并按关闭顺序逐个恢复。
    {
      id: "reopen-tab",
      match: (event) =>
        !effectiveSingleTabMode() &&
        !event.defaultPrevented &&
        matchesConfiguredShortcut(event, fixedShortcuts.reopenTab),
      handler: (event) => {
        event.preventDefault();
        useTabs.getState().reopenLastClosedTab();
      },
    },
  ];
}
