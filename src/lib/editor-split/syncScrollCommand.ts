import { isSyncScrollAvailable, useEditorSplit } from "@/stores/useEditorSplit";
import { activeWorkspaceTab, isNormalEditorSurface } from "./commandContext";

export function syncScrollCommandAvailable(): boolean {
  if (!isNormalEditorSurface()) return false;
  const tab = activeWorkspaceTab();
  return Boolean(tab && isSyncScrollAvailable(tab.id));
}

export function toggleActiveSyncScroll(): void {
  const tab = activeWorkspaceTab();
  if (!tab || !syncScrollCommandAvailable()) return;
  useEditorSplit.getState().toggleSyncScroll(tab.id);
}
