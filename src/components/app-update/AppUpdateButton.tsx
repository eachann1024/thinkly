import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/app-update/AppUpdateButton.tsx#localMessages:1">`
zh-Hans:
  update: "更新"
  updateStatus: "更新，{{status}}"
en:
  update: "Update"
  updateStatus: "Update, {{status}}"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { cn } from "@/lib/utils";
import { hasNewAppUpdate } from "@/lib/appUpdateAvailability";
import { updatePercent, updateStatusLabel } from "./updatePresentation";

export function AppUpdateButton({ className }: { className?: string }) {
  const { currentVersion, state, open, setOpen, installing, installError } = useAppUpdate();
  const busy = installing || state.status === "checking" || state.status === "downloading";
  const ready = state.status === "ready";
  const percent = updatePercent(state);
  const label = state.status === "downloading" && percent !== undefined ? `${percent}%` : uiText("update");
  const tooltip = updateStatusLabel(state, installing, installError) || uiText("update");
  if (!hasNewAppUpdate(currentVersion, state)) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton
          type="button"
          size="xs"
          className={cn(className, "sidebar-footer-control--labeled")}
          aria-label={busy || ready ? uiText("updateStatus", {status: tooltip}) : uiText("update")}
          title={tooltip}
          aria-haspopup="dialog"
          aria-expanded={open}
          busy={busy}
          onClick={() => setOpen(true)}
        >
          <span className="relative">
            {busy ? <GooseIcons.Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <GooseIcons.RotateCw aria-hidden="true" className="h-4 w-4" />}
            {ready && <span aria-hidden="true" className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />}
          </span>
          <span className="sidebar-rail-control-label">{label}</span>
        </IconButton>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
