import type { SettingsTab } from "@/pages/workspace/components/sidebar/settings/types";
import { common } from "@/i18n/common";
import { createTranslator, i18nYaml } from "@/i18n/core";
import { dismissSaveRecoveryNotice, showSaveRecoveryNotice } from "@/lib/save-recovery-notice";
import { deferWorkspaceMaintenance } from "./workspace-navigation-timing";

const localMessages = i18nYaml<"src/lib/settings-navigation.ts#localMessages:1">`
zh-Hans:
  settingsNavigationUnavailable: "设置窗口尚未响应，请重试。"
en:
  settingsNavigationUnavailable: "The settings window did not respond. Try again."
ja:
  settingsNavigationUnavailable: "設定ウィンドウが応答しませんでした。もう一度お試しください。"
`;
const uiText = createTranslator(localMessages);

export function isWorkspaceSettingsOpen(root: Pick<Document, "body"> = document): boolean {
  return root.body.hasAttribute("data-goose-settings-open");
}

export function activateWorkspace(host: Window = window): void {
  deferWorkspaceMaintenance();
  host.dispatchEvent(new CustomEvent("goose-note:workspace-activate"));
}

export function isSettingsTab(value: unknown): value is SettingsTab {
  return typeof value === "string" && ["appearance", "general", "shortcuts", "local-folder", "git-sync", "ai", "data", "feedback"].includes(value);
}

export function settingsToastAction(tab: SettingsTab, label: string) {
  return {
    label,
    onClick: () => {
      void openSettingsFromToast(tab).catch(() => {
        showSettingsNavigationFailure(tab, label);
      });
    },
  };
}

async function openSettingsFromToast(tab: SettingsTab): Promise<void> {
  const desktop = window.gooseDesktop;
  let kind: "workspace" | "quicknote" | "search" | undefined;
  try {
    kind = (await desktop?.getWindowContext?.())?.kind;
  } catch {
    // Workspace renderers can still confirm the local event below.
  }

  if (!desktop || kind === "workspace" || !kind) {
    const event = new CustomEvent("goose-note:open-settings", {
      cancelable: true,
      detail: { tab },
    });
    if (!window.dispatchEvent(event)) {
      dismissSaveRecoveryNotice(settingsNavigationNoticeId(tab));
      return;
    }
    if (kind === "quicknote" || kind === "search") {
      throw new Error("Settings navigation bridge is unavailable");
    }
    throw new Error("No settings listener handled the request");
  }

  if ((kind === "quicknote" || kind === "search") && desktop.openSettings) {
    if (await desktop.openSettings(tab)) {
      dismissSaveRecoveryNotice(settingsNavigationNoticeId(tab));
      return;
    }
  }
  throw new Error("Settings navigation was not queued");
}

function showSettingsNavigationFailure(tab: SettingsTab, label: string): void {
  const id = settingsNavigationNoticeId(tab);
  const retry = async () => {
    await openSettingsFromToast(tab);
  };
  showSaveRecoveryNotice({
    id,
    title: label,
    description: uiText("settingsNavigationUnavailable"),
    retryLabel: common("retry"),
    onRetry: retry,
    onRetryFailure: () => uiText("settingsNavigationUnavailable"),
  });
}

function settingsNavigationNoticeId(tab: SettingsTab): string {
  return `goose-settings-navigation-failed:${tab}`;
}

const SETTINGS_HOTKEYS = new Set([
  "open-settings", "open-search", "toggle-ai-panel", "toggle-sidebar", "toggle-theme",
  "new-note", "new-tab", "new-window", "unified-close", "switch-sidebar-view-by-number",
  "switch-tab-by-number", "cycle-tab", "reopen-tab", "nav-back", "nav-forward",
]);
const WORKSPACE_NAVIGATION_HOTKEYS = new Set([
  "open-search", "toggle-ai-panel", "new-note", "new-tab", "switch-sidebar-view-by-number",
  "switch-tab-by-number", "cycle-tab", "reopen-tab", "nav-back", "nav-forward",
]);

export function isHotkeyAllowedInSettings(id: string): boolean {
  return SETTINGS_HOTKEYS.has(id);
}
export function isWorkspaceNavigationHotkey(id: string): boolean {
  return WORKSPACE_NAVIGATION_HOTKEYS.has(id);
}
