import { IconButton } from "@/components/ui/icon-button";
import { AppUpdateButton } from "@/components/app-update/AppUpdateButton";
import { cn } from "@/lib/utils";
import { SidebarRailIcon } from "./SidebarRailIcon";
import "./sidebar-footer-labels.css";

export interface SidebarFooterProps {
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
}

export function SidebarFooter({
  isSettingsOpen,
  onOpenSettings,
}: SidebarFooterProps) {
  const btnClass =
    "sidebar-footer-control inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 text-muted-foreground [&_svg]:block";
  const activeClass =
    "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]";

  return (
    <TooltipProvider delayDuration={600}>
      <div className="sidebar-rail-footer">
        <AppUpdateButton className={btnClass} />
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton size="xs"
              type="button"
              className={cn(btnClass, isSettingsOpen && activeClass)}
              aria-label="设置"
              title="设置"
              aria-pressed={isSettingsOpen}
              onClick={onOpenSettings}
            >
              <SidebarRailIcon name="settings" selected={isSettingsOpen} />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="right">设置</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
