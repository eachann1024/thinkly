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
    // Mark the handoff before closing. The close listener and this handler
    // can both run in one turn; the layout effect consumes the flag after
    // settings are actually gone.
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

  // Mod+J 快捷键（useAppHotkeys 派发）→ 开关 AI 面板，与 UI 按钮门控一致：未启用 AI 时不响应
  useEffect(() => {
    const onToggle = () => {
      handleToggleAiPanel();
    };
    window.addEventListener("goose-note:toggle-ai-panel", onToggle);
    return () =>
      window.removeEventListener("goose-note:toggle-ai-panel", onToggle);
  }, [handleToggleAiPanel]);

  // 极简工作区的新建页会直接进入标题编辑。若此时 AI 正以全屏覆盖主区域，
  // 必须同步退出 AI，否则只会看到页头标题框，正文仍错误地停留在 AI 会话。
  useEffect(
    () =>
      subscribePageTitleFocus(() => {
        if (aiPanelOpen && isFullscreenAiLayout(aiLayoutMode)) {
          closeAiPanel();
        }
      }),
    [aiLayoutMode, aiPanelOpen, closeAiPanel],
  );

  // 编辑器内的显式面板事件统一走此入口。
  // 使用 open 而非 toggle，重复触发不会把已经打开的面板关掉。
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
      // 面板已打开时重复触发「打开」不会重挂载，补发聚焦事件让输入框重新获焦；
      // 首次挂载时面板自身会聚焦，此事件无害。
      window.dispatchEvent(new CustomEvent("goose-note:focus-ai-composer"));
    };
    window.addEventListener("goose-note:open-ai-panel", onOpen);
    return () => window.removeEventListener("goose-note:open-ai-panel", onOpen);
  }, [aiAvailableForNotebook, openAiPanel, setAiLayoutMode]);

  // AI 功能不可用时强制收起侧栏面板，避免 localStorage 仍为 true 导致下次误展开
  useEffect(() => {
    if (!aiAvailableForNotebook) closeAiPanel();
  }, [aiAvailableForNotebook, closeAiPanel]);
  return { ...input, handleToggleAiPanel };
}
