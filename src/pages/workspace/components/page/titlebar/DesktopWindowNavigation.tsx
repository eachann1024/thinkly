import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTabs } from "@/stores/useTabs";

export const actionButtonClass =
  "inline-flex items-center justify-center text-muted-foreground ";

export function DesktopWindowNavigation({
  canGoBack, canGoForward, onBeforeActivateTab, onToggleSidebar,
  toggleSidebarCollapsed, sidebarCollapsed, toggleSidebarShortcutLabel,
}: {
  canGoBack: boolean; canGoForward: boolean; onBeforeActivateTab?: () => void;
  onToggleSidebar?: () => void; toggleSidebarCollapsed: () => void;
  sidebarCollapsed: boolean; toggleSidebarShortcutLabel: string;
}) {
  return (
    <div
      className="electron-window-controls flex shrink-0 items-center gap-1"
      data-electron-no-drag
    >
      <TooltipProvider delayDuration={600}>
        {[
          { label: "后退", Icon: GooseIcons.ArrowLeft, disabled: !canGoBack, onClick: () => { onBeforeActivateTab?.(); useTabs.getState().goBackTabHistory(); } },
          { label: "前进", Icon: GooseIcons.ArrowRight, disabled: !canGoForward, onClick: () => { onBeforeActivateTab?.(); useTabs.getState().goForwardTabHistory(); } },
        ].map(({ label, Icon, disabled, onClick }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <IconButton size="icon" tone="muted" type="button" className={cn(actionButtonClass, "disabled:pointer-events-none disabled:text-disabled")} aria-label={label} disabled={disabled} onClick={onClick}>
                <Icon className="h-4 w-4" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton size="icon" tone="muted"
              type="button"
              className={cn(actionButtonClass, "sidebar-toggle-button")}
              onClick={onToggleSidebar ?? toggleSidebarCollapsed}
              aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
              aria-pressed={sidebarCollapsed}
              aria-expanded={!sidebarCollapsed}
            >
              <GooseIcons.PanelLeft className="h-4 w-4" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>{sidebarCollapsed ? "展开侧栏" : "收起侧栏"}</span>
            {toggleSidebarShortcutLabel && (
              <span className="ml-2 text-[11px] text-muted-foreground">
                {toggleSidebarShortcutLabel}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

}
