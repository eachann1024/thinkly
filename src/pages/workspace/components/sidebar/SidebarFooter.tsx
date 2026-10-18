import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/SidebarFooter.tsx#localMessages:1">`
zh-Hans:
  settings_e366: "设置"
  feedback_4c2a: "反馈"
en:
  settings_e366: "Settings"
  feedback_4c2a: "Feedback"
ja:
  settings_e366: "設定"
  feedback_4c2a: "フィードバック"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import { AppUpdateButton } from "@/components/app-update/AppUpdateButton";
import { cn } from "@/lib/utils";
import { ReflectionButton } from "./reflection/ReflectionButton";
import { SidebarRailIcon } from "./SidebarRailIcon";
import { CharacterAvatar, useHasCharacter } from "./CharacterAvatar";
import "./sidebar-footer-labels.css";
import "../settings/settings-layout.css";

export interface SidebarFooterProps {
  isSettingsOpen: boolean;
  feedbackActive: boolean;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
}

export function SidebarFooter({
  isSettingsOpen,
  feedbackActive,
  onOpenSettings,
  onOpenFeedback,
}: SidebarFooterProps) {
  useLocale();
  const hasCharacter = useHasCharacter();
  const btnClass =
    "sidebar-footer-control inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 text-muted-foreground [&_svg]:block";
  const activeClass =
    "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]";

  return (
    <TooltipProvider delayDuration={600}>
      <div className="sidebar-rail-footer">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton size="xs"
              type="button"
              data-feedback-entry=""
              className={cn(btnClass, "feedback-rail-sheen", feedbackActive && activeClass)}
              aria-label={uiText("feedback_4c2a")}
              title={uiText("feedback_4c2a")}
              aria-pressed={feedbackActive}
              onClick={onOpenFeedback}
            >
              <SidebarRailIcon name="feedback" selected={feedbackActive} />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="right">{uiText("feedback_4c2a")}</TooltipContent>
        </Tooltip>
        <AppUpdateButton className={btnClass} />
        <ReflectionButton className={btnClass} />
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton size="xs"
              type="button"
              className={cn(btnClass, isSettingsOpen && !feedbackActive && activeClass)}
              aria-label={uiText("settings_e366")}
              title={uiText("settings_e366")}
              aria-pressed={isSettingsOpen && !feedbackActive}
              onClick={onOpenSettings}
            >
              {hasCharacter ? <CharacterAvatar /> : <SidebarRailIcon name="settings" selected={isSettingsOpen && !feedbackActive} />}
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="right">{uiText("settings_e366")}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
