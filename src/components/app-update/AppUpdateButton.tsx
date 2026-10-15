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
  const label = state.status === "downloading" && percent !== undefined ? `${percent}%` : "更新";
  const tooltip = updateStatusLabel(state, installing, installError) || "更新";
  if (!hasNewAppUpdate(currentVersion, state)) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton
          type="button"
          size="xs"
          className={cn(className, "sidebar-footer-control--labeled")}
          aria-label={busy || ready ? `更新，${tooltip}` : "更新"}
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
