import { useCallback, useEffect } from "react";
import { cancelPendingAiSlashCommand } from "../components/notebook-ai/session/slashCommandRequest";
import { aiToggleSteps } from "../components/sidebar/sidebar-shell/railClick";
import { isFullscreenAiLayout } from "../components/notebook-ai/useNotebookAiPanel";
import { subscribePageTitleFocus } from "@/lib/page-title-focus";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import {
  revealSqueezedAiPanel,
  useSidebarAiSqueeze,
} from "../components/sidebar/sidebar-shell/sidebarAiSqueeze";
import type { useWorkspaceSettingsNavigation } from "./useWorkspaceSettingsNavigation";

export function useWorkspaceAiNavigation(
  input: ReturnType<typeof useWorkspaceSettingsNavigation>,
) {
  const {
    aiPanelOpen,
    aiLayoutMode,
    setAiLayoutMode,
    openAiPanel,
    toggleAiPanel,
    closeAiPanel,
    aiFullscreen,
    aiAvailableForNotebook,
    settingsOpen,
    focusAiAfterSettingsCloseRef,
    closeSettings,
  } = input;

  const handleToggleAiPanel = useCallback(() => {
    if (settingsOpen) focusAiAfterSettingsCloseRef.current = true;
    if (!settingsOpen && !aiFullscreen && aiPanelOpen && useSidebarAiSqueeze.getState().hidden) {
      revealSqueezedAiPanel();
      window.dispatchEvent(new CustomEvent("goose-note:focus-ai-composer"));
      return;
    }
    const vp = useWorkspaceViewport.getState();
    const steps = aiToggleSteps({
      available: aiAvailableForNotebook,
      settingsOpen,
      aiFullscreen,
      panelOpen: aiPanelOpen,
      forceCollapseRight: vp.forceCollapseRight,
      rightExpandOverride: vp.rightExpandOverride,
    });
    if (steps.some((step) => step.type === "ignore")) return;
    closeSettings();
    let focusComposer = false;
    for (const step of steps) {
      if (step.type === "open") openAiPanel();
      else if (step.type === "close") closeAiPanel();
      else if (step.type === "toggle") {
        toggleAiPanel();
        if (!aiPanelOpen) focusComposer = true;
      } else if (step.type === "expand-right") {
        vp.setRightExpandOverride(true);
        if (!settingsOpen) focusComposer = true;
      } else if (step.type === "set-right-override") {
        vp.setRightExpandOverride(step.value);
        if (step.value) focusComposer = true;
      }
    }
    if (focusComposer) {
      window.dispatchEvent(new CustomEvent("goose-note:focus-ai-composer"));
    }
  }, [
    closeSettings,
    settingsOpen,
    aiAvailableForNotebook,
    aiFullscreen,
    aiPanelOpen,
    openAiPanel,
    closeAiPanel,
    toggleAiPanel,
  ]);

  useEffect(() => {
    const onToggle = () => {
      handleToggleAiPanel();
    };
    window.addEventListener("goose-note:toggle-ai-panel", onToggle);
    return () =>
      window.removeEventListener("goose-note:toggle-ai-panel", onToggle);
  }, [handleToggleAiPanel]);

  useEffect(
    () =>
      subscribePageTitleFocus(() => {
        if (aiPanelOpen && isFullscreenAiLayout(aiLayoutMode)) {
          closeAiPanel();
        }
      }),
    [aiLayoutMode, aiPanelOpen, closeAiPanel],
  );

  useEffect(() => {
    const onOpen = (event: Event) => {
      if (!aiAvailableForNotebook) {
        cancelPendingAiSlashCommand();
        return;
      }
      const detail = (event as CustomEvent<unknown>).detail;
      const record =
        detail && typeof detail === "object"
          ? (detail as Record<string, unknown>)
          : null;
      if (record?.layout === "side-panel") {
        setAiLayoutMode("side-panel");
      }
      const capture =
        record &&
        record.version === 1 &&
        typeof record.pageId === "string" &&
        Boolean(record.selection)
          ? (detail as Parameters<typeof openAiPanel>[0])
          : null;
      openAiPanel(capture);
      if (useWorkspaceViewport.getState().forceCollapseRight) {
        useWorkspaceViewport.getState().setRightExpandOverride(true);
      }
      window.dispatchEvent(new CustomEvent("goose-note:focus-ai-composer"));
    };
    window.addEventListener("goose-note:open-ai-panel", onOpen);
    return () => window.removeEventListener("goose-note:open-ai-panel", onOpen);
  }, [aiAvailableForNotebook, openAiPanel, setAiLayoutMode]);

  useEffect(() => {
    if (!aiAvailableForNotebook) closeAiPanel();
  }, [aiAvailableForNotebook, closeAiPanel]);
  return { ...input, handleToggleAiPanel };
}
