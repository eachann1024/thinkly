import type { GooseWindowTabSnapshot } from "@/lib/electron/windowContext";
import type { PersistedTabs } from "./persistence";

type PendingStartup =
  | { source: "default" }
  | { source: "restored"; tabs: GooseWindowTabSnapshot[] }
  | { source: "take" };
export type TabsStartupState =
  | { phase: "awaiting-window"; pending: PendingStartup }
  | { phase: "ready-default"; windowId: string }
  | { phase: "ready-destination"; windowId: string }
  | { phase: "ready-restored"; windowId: string }
  | { phase: "ready-take"; windowId: string };
export type TabsStartupEvent =
  | { type: "tab-taken"; tab: GooseWindowTabSnapshot }
  | { type: "tabs-restored"; tabs: GooseWindowTabSnapshot[]; destinationHasTabs: boolean }
  | { type: "context-resolved"; windowId: string; destination: PersistedTabs | null };
export type TabsStartupCommand =
  | { type: "apply-snapshots"; tabs: GooseWindowTabSnapshot[]; activeId?: string }
  | { type: "apply-destination"; tabs: PersistedTabs }
  | { type: "restore-taken-split"; tabId: string | null }
  | { type: "persist" }
  | { type: "clean-fallback" };

export function transitionTabsStartup(
  state: TabsStartupState,
  event: TabsStartupEvent,
): { state: TabsStartupState; commands: TabsStartupCommand[] } {
  const taken = state.phase === "ready-take" ||
    (state.phase === "awaiting-window" && state.pending.source === "take");
  switch (event.type) {
    case "tab-taken":
      return { state: state.phase === "awaiting-window"
        ? { phase: "awaiting-window", pending: { source: "take" } }
        : { phase: "ready-take", windowId: state.windowId },
      commands: [
        { type: "apply-snapshots", tabs: [event.tab], activeId: event.tab.id },
        { type: "restore-taken-split", tabId: event.tab.id }, { type: "persist" },
      ] };
    case "tabs-restored":
      if (taken || !event.tabs.length) return { state, commands: [] };
      if (state.phase === "awaiting-window") return {
        state: { phase: "awaiting-window", pending: { source: "restored", tabs: event.tabs } }, commands: [],
      };
      // 与原初始化事件一致：已存在非空目标档案时才阻止 restored payload。
      if (event.destinationHasTabs) return { state, commands: [] };
      return { state: { phase: "ready-restored", windowId: state.windowId }, commands: [
        { type: "apply-snapshots", tabs: event.tabs }, { type: "persist" },
      ] };
    case "context-resolved": {
      if (taken) return { state: { phase: "ready-take", windowId: event.windowId },
        commands: [{ type: "persist" }, { type: "restore-taken-split", tabId: null }] };
      // 真实 windowId 的档案即使为空也具有恢复优先级。
      if (event.destination) return { state: { phase: "ready-destination", windowId: event.windowId },
        commands: [{ type: "apply-destination", tabs: event.destination }] };
      if (state.phase === "awaiting-window" && state.pending.source === "restored") return {
        state: { phase: "ready-restored", windowId: event.windowId }, commands: [
          { type: "apply-snapshots", tabs: state.pending.tabs }, { type: "persist" }, { type: "clean-fallback" },
        ],
      };
      return { state: { phase: state.phase === "ready-restored" ? "ready-restored" : "ready-default", windowId: event.windowId },
        commands: [{ type: "persist" }, { type: "clean-fallback" }] };
    }
  }
}
