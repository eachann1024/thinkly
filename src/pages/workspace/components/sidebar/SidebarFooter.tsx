import { IconButton } from "@/components/ui/icon-button";
import { toast } from "@/components/ui/sonner";
import * as GooseIcons from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { checkAppUpdate, openReleasePage } from "@/lib/electron/appUpdate";
import { cn } from "@/lib/utils";
import { NotebookSwitcher } from "./NotebookSwitcher";
import "./sidebar-footer-labels.css";

export interface SidebarFooterProps {
  notebookFooterHost: HTMLDivElement | null;
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
}

export function SidebarFooter({
  notebookFooterHost,
  isSettingsOpen,
  onOpenSettings,
}: SidebarFooterProps) {
  const [readyVersion, setReadyVersion] = useState("");
  const [availableVersion, setAvailableVersion] = useState("");
  useEffect(() => {
    const desktop = getGooseDesktop();
    if (!desktop) return;
    const unsubscribe = desktop.onUpdateReady(setReadyVersion);
    void desktop.getReadyUpdate().then(setReadyVersion).catch(() => {});
    return unsubscribe;
  }, []);
  useEffect(() => {
    if (!getGooseDesktop()) return;
    let active = true;
    const check = async () => {
      try {
        const result = await checkAppUpdate();
        if (active) setAvailableVersion(result?.status === "available" ? result.latestVersion : "");
      } catch { /* Background update checks stay silent on network errors. */ }
    };
    void check();
    const timer = window.setInterval(() => void check(), 4 * 60 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const btnClass =
    "sidebar-footer-control inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 text-muted-foreground [&_svg]:block";
  const activeClass =
    "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]";

  return (
    <TooltipProvider delayDuration={600}>
      <div className="sidebar-rail-footer">
        {readyVersion ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton size="xs"
                type="button"
                className={cn(btnClass, activeClass)}
                data-active="true"
                aria-label={`新版本 v${readyVersion} 已就绪，点击重启并更新`}
                title={`新版本 v${readyVersion} 已就绪，点击重启并更新`}
                onClick={() => void getGooseDesktop()?.installReadyUpdate().catch((error: unknown) => {
                  toast.error(error instanceof Error ? error.message : "安装更新失败，请重试");
                })}
              >
                <GooseIcons.RotateCw className="h-4 w-4" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              新版本 v{readyVersion} 已就绪，点击重启并更新
            </TooltipContent>
          </Tooltip>
        ) : availableVersion ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton size="xs"
                type="button"
                className={cn(btnClass, activeClass)}
                data-active="true"
                aria-label={`发现新版本 v${availableVersion}，查看更新说明`}
                title={`发现新版本 v${availableVersion}，查看更新说明`}
                onClick={() => openReleasePage()}
              >
                <GooseIcons.Download className="h-4 w-4" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              发现新版本 v{availableVersion}，查看更新说明
            </TooltipContent>
          </Tooltip>
        ) : null}
        <NotebookSwitcher
          variant={notebookFooterHost ? "default" : "rail"}
          triggerContainer={notebookFooterHost}
          onOpenSettings={onOpenSettings}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton size="xs"
              type="button"
              className={cn(btnClass, "sidebar-footer-control--labeled", isSettingsOpen && activeClass)}
              aria-label="设置"
              title="设置"
              aria-pressed={isSettingsOpen}
              onClick={onOpenSettings}
            >
              <GooseIcons.Settings aria-hidden="true" className="h-4 w-4" />
              <span className="sidebar-rail-control-label">设置</span>
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="right">设置</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
