import { navigateNotebookAiReference } from "@/lib/notebook-ai/navigateReference";
import { openPageFromSidebar } from "@/lib/sidebarPageNavigation";
import { markReflectionSeen, readReflectionAction } from "@/pages/workspace/components/sidebar/reflection/ReflectionHost";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useReflection } from "@/stores/useReflection";
import { useSettings } from "@/stores/useSettings";
import { applyAuxiliaryAISetup } from "./applyAuxiliaryAISetup";
import { applyAuxiliaryImageExportSettings } from "./applyImageExportSettings";
import { readRecoveryDraftEntry, registerRecoveryDraftSnapshot } from "./recoveryDraftSnapshot";
import { readReflectionRecord } from "./reflectionRecordSnapshot";
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
  registerMainSnapshot("reflection-action", () => null);
  registerMainSnapshot("reflection-seen", () => null);
  registerRecoveryDraftSnapshot();
}

function recoveryEntryQuery(detail: unknown): unknown {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return undefined;
  const query = detail as { source?: unknown; id?: unknown };
  if (query.source !== "internal-page" && query.source !== "local-file" && query.source !== "quicknote") return undefined;
  if (typeof query.id !== "string" || query.id.length < 1 || query.id.length > 400) return undefined;
  return readRecoveryDraftEntry(query.source, query.id);
}

function snapshotValue(key: string, detail?: unknown): unknown {
  if (key === "recovery-draft-entry") return recoveryEntryQuery(detail);
  if (key === "reflection-action") return readReflectionAction(detail);
  if (key === "reflection-seen") return markReflectionSeen(detail);
  return readRegisteredSnapshot(key);
}

export function installAuxiliaryMainBridge(): void {
  if (installed) return;
  installed = true;
  installDefaults();
  const bridge = window.gooseDesktop?.auxiliary;
  if (!bridge) return;
  bridge.onSnapshotRequest((requestId, key, detail) => {
    const dynamic = key === "recovery-draft-entry" || key === "reflection-action" || key === "reflection-seen" || key === "reflection-record";
    if (!hasMainSnapshot(key) && !dynamic) {
      bridge.replySnapshot(requestId, null, false);
      return;
    }
    if (key === "reflection-record") {
      void readReflectionRecord(detail).then(
        (value) => bridge.replySnapshot(requestId, value, value != null),
        () => bridge.replySnapshot(requestId, null, false),
      );
      return;
    }
    try {
      const raw = JSON.stringify(snapshotValue(key, detail) ?? null);
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
    if (command.type === "apply-ai-setup") {
      applyAuxiliaryAISetup(command.config);
      return;
    }
    if (command.type === "apply-image-export-settings") {
      applyAuxiliaryImageExportSettings(command.settings);
      return;
    }
    if (command.type !== "open-page" || !command.pageId) return;
    window.dispatchEvent(new CustomEvent("goose-note:request-close-settings"));
    navigateNotebookAiReference(command.pageId, (pageId) => {
      openPageFromSidebar(pageId, "permanent");
    }, command.location);
  });
}
