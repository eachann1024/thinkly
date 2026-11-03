import { useLayoutEffect, type CSSProperties } from "react";
import { noteLaunchTraceMounted } from "./launchClock";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { useLaunchLayout } from "./useLaunchLayout";
import "@/pages/workspace/styles/page-layout.css";
import "@/pages/workspace/styles/workspace/shell.css";
import "@/pages/workspace/styles/workspace/native-titlebar.css";
import "@/pages/workspace/components/sidebar/sidebar-layout.css";
import "@/pages/workspace/components/sidebar/sidebar-hover.css";
import "@/pages/workspace/components/sidebar/sidebar-navigation.css";
import "@/pages/workspace/styles/workspace/sidebar.css";
import "@/pages/workspace/styles/workspace/navigation-rail.css";
import "./launch-trace.css";

const sidebarBars = [96, 84, 64, 112];
const bodyBars = [
  { width: "34%", delay: 820, kind: "title" },
  { width: "10%", delay: 880, kind: "heading" },
  { width: "96%", delay: 920 },
  { width: "88%", delay: 960 },
  { width: "92%", delay: 1000 },
  { width: "58%", delay: 1040 },
  { width: "10%", delay: 1080, kind: "heading" },
  { width: "84%", delay: 1120 },
  { width: "70%", delay: 1160 },
];
// 沿用 DesktopWindowNavigation 的控件槽位及窄窗显隐类。
const navigationSlots = [
  "electron-history-button", "electron-history-button", "sidebar-toggle-button", "window-always-on-top-button",
];
const delayed = (delay: number, width?: string): CSSProperties => ({
  "--goose-launch-delay": `${delay}ms`,
  ...(width ? { width } : {}),
}) as CSSProperties;

export function LaunchTrace() {
  const {
    stageRef, ready, sidebarRowHeight, collapsed, sidebarWidth, railItems, footerItems, pageLayout,
  } = useLaunchLayout();
  const electron = isElectronRuntime();
  useLayoutEffect(() => {
    noteLaunchTraceMounted();
  }, []);

  return (
    <div
      className="goose-launch-root workspace-shell window-shell-safe-top flex overflow-hidden"
      data-electron-chrome={electron || undefined}
      data-launch-ready={ready || undefined}
      aria-hidden="true"
      style={{
        "--workspace-sidebar-width": `${sidebarWidth}px`,
        "--main-tree-row-height": `${sidebarRowHeight}px`,
      } as CSSProperties}
    >
      {electron && (
        <div className="electron-titlebar flex w-full shrink-0 items-center" data-sidebar-collapsed={collapsed}>
          <div className="electron-window-controls flex shrink-0 items-center gap-1">
            {navigationSlots.map((className, index) => (
              <span key={index} className={`${className} goose-launch-navigation-slot`}>
                <span className="goose-launch-bar goose-launch-in" style={delayed(700 + index * 40)} />
              </span>
            ))}
          </div>
          <div className="electron-document-header relative flex min-w-0 flex-1 items-center">
            <span className="goose-launch-bar goose-launch-in goose-launch-tab" style={delayed(820)} />
          </div>
        </div>
      )}
      <div ref={stageRef} className="workspace-stage" data-sidebar-collapsed={collapsed || undefined}>
        <div className="sidebar-rail-shell">
          <div className="sidebar-mode-rail">
            {railItems.map((item, index) => (
              <span key={item} className="sidebar-mode-rail-button goose-launch-icon goose-launch-in"
                data-active={item === "pages" || undefined} style={delayed(560 + index * 50)} />
            ))}
          </div>
          <div className="sidebar-rail-footer">
            {footerItems.map((item, index) => (
              <span key={item} className="sidebar-footer-control goose-launch-icon goose-launch-in"
                style={delayed(710 + index * 50)} />
            ))}
          </div>
        </div>
        <div className="workspace-sidebar-pane" hidden={collapsed} style={{ width: sidebarWidth }}>
          <div className="sidebar-size-container h-full">
            <div className="h-full">
              <div className="sidebar-content-surface flex h-full flex-col overflow-hidden">
                <div className="sidebar-design flex min-h-0 flex-1 flex-col">
                  <div className="sidebar-navigation-heading">
                    <span className="goose-launch-bar goose-launch-in" style={delayed(760, "96px")} />
                  </div>
                  <div className="sidebar-page-list">
                    <div className="sidebar-tree-scroll">
                      {sidebarBars.map((width, index) => (
                        <div key={width} className="goose-launch-sidebar-row">
                          <span className="goose-launch-bar goose-launch-in" style={delayed(800 + index * 40, `${width}px`)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="workspace-main-sheet relative h-full flex-1 overflow-hidden" data-page-layout={pageLayout}>
          <div className="page-layout-body h-full">
            <div className="page-layout-document">
              <div className="goose-launch-column">
                {bodyBars.map(({ width, delay, kind }) => (
                  <span key={delay} className="goose-launch-bar goose-launch-line"
                    data-kind={kind} style={delayed(delay, width)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
