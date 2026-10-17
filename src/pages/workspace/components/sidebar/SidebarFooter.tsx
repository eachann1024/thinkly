import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/SidebarFooter.tsx#localMessages:1">`
zh-Hans:
  settings_e366: "设置"
en:
  settings_e366: "Settings"
ja:
  settings_e366: "設定"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import { AppUpdateButton } from "@/components/app-update/AppUpdateButton";
import { cn } from "@/lib/utils";
import { ReflectionButton } from "./reflection/ReflectionButton";
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
  useLocale();
  const btnClass =
    "sidebar-footer-control inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 text-muted-foreground [&_svg]:block";
  const activeClass =
    "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]";

  return (
    <TooltipProvider delayDuration={600}>
      <div className="sidebar-rail-footer">
        <AppUpdateButton className={btnClass} />
        <ReflectionButton className={btnClass} />
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton size="xs"
              type="button"
              className={cn(btnClass, isSettingsOpen && activeClass)}
              aria-label={uiText("settings_e366")}
              title={uiText("settings_e366")}
              aria-pressed={isSettingsOpen}
              onClick={onOpenSettings}
            >
              <SidebarRailIcon name="settings" selected={isSettingsOpen} />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="right">{uiText("settings_e366")}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
