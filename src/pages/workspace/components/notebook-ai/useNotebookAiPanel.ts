import { useState, useCallback, useEffect, useRef } from "react";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { useTabs, isNotebookAiTab } from "@/stores/useTabs";
import { FILE_NAV_AI_PANEL, useFileNavHistory } from "@/stores/useFileNavHistory";

const OPEN_STORAGE_KEY = "thinkly-ai-panel-open";
const LAYOUT_STORAGE_KEY = "thinkly-ai-layout-mode";

export type NotebookAiLayoutMode = "side-panel" | "fullscreen" | "tab";

export interface NotebookAiPanelSelectionCapture<TSelection = unknown> {
  version: 1;
  pageId: string;
  selection: TSelection;
}

export function isFullscreenAiLayout(
  mode: NotebookAiLayoutMode | undefined,
): boolean {
  return mode === "fullscreen" || mode === "tab";
}

function readStoredOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_STORAGE_KEY) === "true";
  } catch {
  }
  return false;
}

function readStoredLayoutMode(): NotebookAiLayoutMode {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw === "side-panel") return "side-panel";
    if (raw === "fullscreen" || raw === "tab") return "fullscreen";
  } catch {
  }
  return "side-panel";
}

function persistOpen(next: boolean) {
  try {
    localStorage.setItem(OPEN_STORAGE_KEY, String(next));
  } catch {
  }
}

function persistLayoutMode(mode: NotebookAiLayoutMode) {
  try {
    const normalized =
      mode === "tab" || mode === "fullscreen" ? "fullscreen" : "side-panel";
    localStorage.setItem(LAYOUT_STORAGE_KEY, normalized);
  } catch {
  }
}

function purgeLegacyNotebookAiTabs() {
  useTabs.setState((state) => {
    const legacyIds = new Set(
      state.openTabs.filter((tab) => isNotebookAiTab(tab)).map((tab) => tab.id),
    );
    if (legacyIds.size === 0) return state;
    const openTabs = state.openTabs.filter((tab) => !legacyIds.has(tab.id));
    const activeTabId =
      state.activeTabId && !legacyIds.has(state.activeTabId)
        ? state.activeTabId
        : (openTabs[openTabs.length - 1]?.id ?? null);
    const tabHistory = state.tabHistory.filter((id) => !legacyIds.has(id));
    return {
      openTabs,
      activeTabId,
      tabHistory,
      tabHistoryIndex: tabHistory.length - 1,
    };
  });
}

let closeAiPanelHandler: (() => void) | null = null;

export function isNotebookAiFullscreenOpen(): boolean {
  const vp = useWorkspaceViewport.getState();
  return readStoredOpen() && (isFullscreenAiLayout(readStoredLayoutMode()) || vp.forceCollapseLeft && vp.rightExpandOverride);
}

export function closeNotebookAiIfFullscreen(): void {
  if (!isNotebookAiFullscreenOpen()) return;
  closeAiPanelHandler?.();
}

export function closeNotebookAiPanel(): boolean {
  if (!readStoredOpen() || !closeAiPanelHandler) return false;
  closeAiPanelHandler();
  return true;
}

export function useNotebookAiPanel() {
  const [isOpen, setIsOpen] = useState<boolean>(readStoredOpen);
  const [layoutMode, setLayoutModeState] = useState<NotebookAiLayoutMode>(
    readStoredLayoutMode,
  );
  const [capturedSelection, setCapturedSelection] =
    useState<NotebookAiPanelSelectionCapture | null>(null);
  const layoutModeRef = useRef(layoutMode);
  layoutModeRef.current = layoutMode;

  const open = useCallback(
    (capture?: NotebookAiPanelSelectionCapture | null) => {
      setCapturedSelection(capture ?? null);
      setIsOpen(true);
      persistOpen(true);
      useFileNavHistory.getState().push(FILE_NAV_AI_PANEL);
    },
    [],
  );

  const close = useCallback(() => {
    setCapturedSelection(null);
    setIsOpen(false);
    persistOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setCapturedSelection(null);
    setIsOpen((prev) => {
      const next = !prev;
      persistOpen(next);
      if (next) useFileNavHistory.getState().push(FILE_NAV_AI_PANEL);
      return next;
    });
  }, []);

  const setLayoutMode = useCallback((mode: NotebookAiLayoutMode) => {
    const normalized: NotebookAiLayoutMode =
      mode === "tab" || mode === "fullscreen" ? "fullscreen" : "side-panel";
    if (normalized === layoutModeRef.current) return;
    layoutModeRef.current = normalized;
    setLayoutModeState(normalized);
    persistLayoutMode(normalized);
  }, []);

  const consumeCapturedSelection = useCallback(() => {
    setCapturedSelection(null);
  }, []);

  useEffect(() => {
    closeAiPanelHandler = close;
    const onCloseIfFullscreen = () => {
      if (isNotebookAiFullscreenOpen()) {
        close();
      }
    };
    const onClosePanel = () => {
      close();
    };
    window.addEventListener(
      "goose-note:close-ai-panel-if-fullscreen",
      onCloseIfFullscreen,
    );
    window.addEventListener("goose-note:close-ai-panel", onClosePanel);
    return () => {
      if (closeAiPanelHandler === close) {
        closeAiPanelHandler = null;
      }
      window.removeEventListener(
        "goose-note:close-ai-panel-if-fullscreen",
        onCloseIfFullscreen,
      );
      window.removeEventListener("goose-note:close-ai-panel", onClosePanel);
    };
  }, [close]);

  useEffect(() => {
    purgeLegacyNotebookAiTabs();
  }, []);

  return {
    isOpen,
    layoutMode,
    setLayoutMode,
    open,
    close,
    toggle,
    capturedSelection,
    consumeCapturedSelection,
  };
}
