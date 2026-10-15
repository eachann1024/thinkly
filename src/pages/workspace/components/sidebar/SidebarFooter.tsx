import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import { AppUpdateButton } from "@/components/app-update/AppUpdateButton";
import { cn } from "@/lib/utils";
import { NotebookSwitcher } from "./NotebookSwitcher";
import "./sidebar-footer-labels.css";

export interface SidebarFooterProps {
  notebookFooterHost: HTMLDivElement | null;
  showNotebookSwitcher: boolean;
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
}

export function SidebarFooter({
  notebookFooterHost,
  showNotebookSwitcher,
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
        {showNotebookSwitcher && (
          <NotebookSwitcher
            variant={notebookFooterHost ? "default" : "rail"}
            triggerContainer={notebookFooterHost}
            onOpenSettings={onOpenSettings}
          />
        )}
        <AppUpdateButton className={btnClass} />
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
