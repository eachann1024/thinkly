import { openPageFromSidebar } from "@/lib/sidebarPageNavigation";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useReflection } from "@/stores/useReflection";
import { useSettings } from "@/stores/useSettings";
import { hasMainSnapshot, readRegisteredSnapshot, registerMainSnapshot } from "./mainSnapshot";

let installed = false;

function installDefaults(): void {
  if (hasMainSnapshot("settings")) return;
  registerMainSnapshot("settings", () => useSettings.getState());
  registerMainSnapshot("notebooks", () => {
    const state = useNotebooks.getState();
    return { notebooks: state.notebooks, activeNotebookId: state.activeNotebookId };
  });
  registerMainSnapshot("reflection", () => {
    const state = useReflection.getState();
    return {
      reports: state.reports,
      scheduledKeys: state.scheduledKeys,
      lastSeenWeekKey: state.lastSeenWeekKey,
      aiConsent: state.aiConsent,
      aiConsentChosen: state.aiConsentChosen,
      generatingKey: state.generatingKey,
      failure: state.failure,
    };
  });
  registerMainSnapshot("pages", () => usePages.getState().pages);
}

export function installAuxiliaryMainBridge(): void {
  if (installed) return;
  installed = true;
  installDefaults();
  const bridge = window.gooseDesktop?.auxiliary;
  if (!bridge) return;
  bridge.onSnapshotRequest((requestId, key) => {
    if (!hasMainSnapshot(key)) {
      bridge.replySnapshot(requestId, null, false);
      return;
    }
    try {
      const raw = JSON.stringify(readRegisteredSnapshot(key) ?? null);
      if (!raw) {
        bridge.replySnapshot(requestId, null, false);
        return;
      }
      bridge.replySnapshot(requestId, JSON.parse(raw) as unknown, true);
    } catch {
      bridge.replySnapshot(requestId, null, false);
    }
  });
  bridge.onCommand((command) => {
    if (command.type !== "open-page" || !command.pageId) return;
    window.dispatchEvent(new CustomEvent("goose-note:request-close-settings"));
    openPageFromSidebar(command.pageId, "permanent");
  });
}
