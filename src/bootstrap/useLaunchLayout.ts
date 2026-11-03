import { useLayoutEffect, useRef, useState } from "react";
import { useSettings } from "@/stores/useSettings";
import { useSidebarView } from "@/stores/useSidebarView";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { usePages } from "@/stores/usePages";
import { useAiPanelVisibility } from "@/stores/useAiPanelVisibility";
import { useAppUpdateUi } from "@/stores/useAppUpdateUi";
import { hasNewAppUpdate } from "@/lib/appUpdateAvailability";
import { applyAppearanceScaleVariables, computeSidebarFontSize, computeSidebarRowHeight } from "@/lib/appearance";
import { applyFontSmoothing, applyFontVariables } from "@/lib/fontLoader";
import { getDbStorageItem } from "@/lib/storage";
import {
  clampSidebarResizeWidth,
  resolveSidebarWidth,
  WORKSPACE_SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
} from "@/lib/sidebarLayout";
import { computeWorkspaceViewportCollapse, isEffectiveSidebarCollapsed } from "@/lib/workspaceViewport";
import { normalizePageLayout } from "@/lib/local-frontmatter/settings";
import { normalizeSidebarRailOrder } from "@/stores/settings/slices/sidebarRailSlice";
import { useFolderToolbarActions } from "@/pages/workspace/components/page/useFolderToolbarActions";
import { sidebarMaxFromStage } from "@/pages/workspace/components/sidebar/sidebar-shell/sidebarAiSqueeze";
import { readLaunchPreferences } from "./launchPreferences";

export function useLaunchLayout() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [preview] = useState(readLaunchPreferences);
  const settings = useSettings();
  const { _hasHydrated, uiFontSize, editorFontSize, editorLineHeight, customFonts, uiFontFamily, fontSmoothing } = settings;
  useLayoutEffect(() => {
    if (!_hasHydrated) return;
    // 恢复标记早于正常初始化末尾的外观应用，结构显示前先同步外观。
    applyAppearanceScaleVariables({ uiFontSize, editorFontSize, editorLineHeight });
    applyFontVariables(customFonts, { uiFontFamily });
    applyFontSmoothing(fontSmoothing);
  }, [_hasHydrated, uiFontSize, editorFontSize, editorLineHeight, customFonts, uiFontFamily, fontSmoothing]);
  const userCollapsed = useSidebarView((s) => s.sidebarCollapsed);
  const expandOverride = useWorkspaceViewport((s) => s.leftExpandOverride);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [preferredWidth] = useState(() => resolveSidebarWidth(
    getDbStorageItem("sidebar-width"), WORKSPACE_SIDEBAR_DEFAULT_WIDTH,
  ));
  const [maxWidth, setMaxWidth] = useState(SIDEBAR_MAX_WIDTH);
  const forceCollapsed = computeWorkspaceViewportCollapse(viewportWidth).forceCollapseLeft;
  const collapsed = isEffectiveSidebarCollapsed(userCollapsed, forceCollapsed, expandOverride);
  const sidebarWidth = collapsed ? 0 : clampSidebarResizeWidth(preferredWidth, maxWidth);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      setViewportWidth(window.innerWidth);
      setMaxWidth(sidebarMaxFromStage(stage));
    };
    // 首次可见帧前测量舞台，并按真实侧栏规则限制保存宽度。
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  const folderActionsAvailable = useFolderToolbarActions();
  const aiFullscreen = useAiPanelVisibility((s) => s.fullscreen);
  const activePageId = usePages((s) => s.activePageId);
  const page = usePages((s) => activePageId ? s.pages[activePageId] : undefined);
  const aiEnabled = settings._hasHydrated ? settings.ai.enabled : preview.aiEnabled;
  const showAi = aiEnabled && aiFullscreen && folderActionsAvailable && Boolean(activePageId) && !page?.trashedAt;
  const order = normalizeSidebarRailOrder(settings._hasHydrated ? settings.sidebarRailOrder : preview.sidebarRailOrder);
  const showUpdate = useAppUpdateUi((s) => hasNewAppUpdate(s.currentVersion, s.state));
  const defaultLayout = settings._hasHydrated ? settings.defaultPageLayout : preview.defaultPageLayout;

  return {
    stageRef,
    ready: _hasHydrated || preview.hasCachedSettings,
    sidebarRowHeight: computeSidebarRowHeight(computeSidebarFontSize(_hasHydrated ? uiFontSize : preview.uiFontSize)),
    collapsed,
    sidebarWidth,
    railItems: order.filter((item) => item !== "ai" || showAi),
    footerItems: ["feedback", ...(showUpdate ? ["update"] : []), "reflection", "settings"],
    pageLayout: normalizePageLayout(page?.pageLayout ?? defaultLayout),
  };
}
