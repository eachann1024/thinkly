import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/app-update/AppUpdateButton.tsx#localMessages:1">`
zh-Hans:
  update: "更新"
  updateStatus: "更新，{{status}}"
en:
  update: "Update"
  updateStatus: "Update, {{status}}"
ja:
  update: "アップデート"
  updateStatus: "アップデート、{{status}}"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { cn } from "@/lib/utils";
import { hasNewAppUpdate } from "@/lib/appUpdateAvailability";
import { openAppUpdateWindow } from "@/lib/appUpdateWindow";
import { SidebarRailIcon } from "@/pages/workspace/components/sidebar/SidebarRailIcon";
import { updateStatusLabel } from "./updatePresentation";

export function AppUpdateButton({ className }: { className?: string }) {
  useLocale();
  const { currentVersion, state, installing, installError } = useAppUpdate();
  const busy = installing || state.status === "checking" || state.status === "downloading";
  const ready = state.status === "ready";
  const tooltip = updateStatusLabel(state, installing, installError) || uiText("update");
  if (!hasNewAppUpdate(currentVersion, state)) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton
          type="button"
          size="xs"
          className={className}
          aria-label={busy || ready ? uiText("updateStatus", {status: tooltip}) : uiText("update")}
          title={tooltip}
          busy={busy}
          onClick={openAppUpdateWindow}
        >
          <span className="relative inline-flex shrink-0">
            <span className={cn("inline-flex", busy && "motion-safe:animate-spin")}>
              <SidebarRailIcon name="update" selected={false} />
            </span>
            {ready && <span aria-hidden="true" className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />}
          </span>
        </IconButton>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
